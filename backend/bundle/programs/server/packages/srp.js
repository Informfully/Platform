(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var SHA256 = Package.sha.SHA256;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var BigInteger, SRP;

var require = meteorInstall({"node_modules":{"meteor":{"srp":{"srp.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/srp/srp.js                                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
module.export({
  SRP: () => SRP
});
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 0);
let BigInteger;
module.link("./biginteger", {
  default(v) {
    BigInteger = v;
  }

}, 1);
const SRP = {};

/**
 * Generate a new SRP verifier. Password is the plaintext password.
 *
 * options is optional and can include:
 * - identity: String. The SRP username to user. Mostly this is passed
 *   in for testing.  Random UUID if not provided.
 * - hashedIdentityAndPassword: combined identity and password, already hashed, for the SRP to bcrypt upgrade path.
 * - salt: String. A salt to use.  Mostly this is passed in for
 *   testing.  Random UUID if not provided.
 * - SRP parameters (see _defaults and paramsFromOptions below)
 */
SRP.generateVerifier = function (password, options) {
  const params = paramsFromOptions(options);
  const salt = options && options.salt || Random.secret();
  let identity;
  let hashedIdentityAndPassword = options && options.hashedIdentityAndPassword;

  if (!hashedIdentityAndPassword) {
    identity = options && options.identity || Random.secret();
    hashedIdentityAndPassword = params.hash(identity + ":" + password);
  }

  const x = params.hash(salt + hashedIdentityAndPassword);
  const xi = new BigInteger(x, 16);
  const v = params.g.modPow(xi, params.N);
  return {
    identity,
    salt,
    verifier: v.toString(16)
  };
}; // For use with check().


SRP.matchVerifier = {
  identity: String,
  salt: String,
  verifier: String
};
/**
 * Default parameter values for SRP.
 *
 */

const _defaults = {
  hash: x => SHA256(x).toLowerCase(),
  N: new BigInteger("EEAF0AB9ADB38DD69C33F80AFA8FC5E86072618775FF3C0B9EA2314C9C256576D674DF7496EA81D3383B4813D692C6E0E0D5D8E250B98BE48E495C1D6089DAD15DC7D7B46154D6B6CE8EF4AD69B15D4982559B297BCF1885C529F566660E57EC68EDBC3C05726CC02FD4CBF4976EAA9AFD5138FE8376435B9FC61D2FC0EB06E3", 16),
  g: new BigInteger("2")
};
_defaults.k = new BigInteger(_defaults.hash(_defaults.N.toString(16) + _defaults.g.toString(16)), 16);
/**
 * Process an options hash to create SRP parameters.
 *
 * Options can include:
 * - hash: Function. Defaults to SHA256.
 * - N: String or BigInteger. Defaults to 1024 bit value from RFC 5054
 * - g: String or BigInteger. Defaults to 2.
 * - k: String or BigInteger. Defaults to hash(N, g)
 */

const paramsFromOptions = function (options) {
  if (!options) // fast path
    return _defaults;

  var ret = _objectSpread({}, _defaults);

  ['N', 'g', 'k'].forEach(p => {
    if (options[p]) {
      if (typeof options[p] === "string") ret[p] = new BigInteger(options[p], 16);else if (options[p] instanceof BigInteger) ret[p] = options[p];else throw new Error("Invalid parameter: " + p);
    }
  });
  if (options.hash) ret.hash = x => options.hash(x).toLowerCase();

  if (!options.k && (options.N || options.g || options.hash)) {
    ret.k = ret.hash(ret.N.toString(16) + ret.g.toString(16));
  }

  return ret;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"biginteger.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/srp/biginteger.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exportDefault(BigInteger = function () {
  /// BEGIN jsbn.js

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */
  // Basic JavaScript BN library - subset useful for RSA encryption.
  // Bits per digit
  var dbits; // JavaScript engine analysis

  var canary = 0xdeadbeefcafe;
  var j_lm = (canary & 0xffffff) == 0xefcafe; // (public) Constructor

  function BigInteger(a, b, c) {
    if (a != null) if ("number" == typeof a) this.fromNumber(a, b, c);else if (b == null && "string" != typeof a) this.fromString(a, 256);else this.fromString(a, b);
  } // return new, unset BigInteger


  function nbi() {
    return new BigInteger(null);
  } // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.
  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)


  function am1(i, x, w, j, c, n) {
    while (--n >= 0) {
      var v = x * this[i++] + w[j] + c;
      c = Math.floor(v / 0x4000000);
      w[j++] = v & 0x3ffffff;
    }

    return c;
  } // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)


  function am2(i, x, w, j, c, n) {
    var xl = x & 0x7fff,
        xh = x >> 15;

    while (--n >= 0) {
      var l = this[i] & 0x7fff;
      var h = this[i++] >> 15;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
      c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
      w[j++] = l & 0x3fffffff;
    }

    return c;
  } // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.


  function am3(i, x, w, j, c, n) {
    var xl = x & 0x3fff,
        xh = x >> 14;

    while (--n >= 0) {
      var l = this[i] & 0x3fff;
      var h = this[i++] >> 14;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
      c = (l >> 28) + (m >> 14) + xh * h;
      w[j++] = l & 0xfffffff;
    }

    return c;
  }
  /* XXX METEOR XXX
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else 
  */


  {
    // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }
  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = (1 << dbits) - 1;
  BigInteger.prototype.DV = 1 << dbits;
  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2, BI_FP);
  BigInteger.prototype.F1 = BI_FP - dbits;
  BigInteger.prototype.F2 = 2 * dbits - BI_FP; // Digit conversions

  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr, vv;
  rr = "0".charCodeAt(0);

  for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;

  rr = "a".charCodeAt(0);

  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  rr = "A".charCodeAt(0);

  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) {
    return BI_RM.charAt(n);
  }

  function intAt(s, i) {
    var c = BI_RC[s.charCodeAt(i)];
    return c == null ? -1 : c;
  } // (protected) copy this to r


  function bnpCopyTo(r) {
    for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];

    r.t = this.t;
    r.s = this.s;
  } // (protected) set from integer value x, -DV <= x < DV


  function bnpFromInt(x) {
    this.t = 1;
    this.s = x < 0 ? -1 : 0;
    if (x > 0) this[0] = x;else if (x < -1) this[0] = x + DV;else this.t = 0;
  } // return bigint initialized to value


  function nbv(i) {
    var r = nbi();
    r.fromInt(i);
    return r;
  } // (protected) set from string and radix


  function bnpFromString(s, b) {
    var k;
    if (b == 16) k = 4;else if (b == 8) k = 3;else if (b == 256) k = 8; // byte array
    else if (b == 2) k = 1;else if (b == 32) k = 5;else if (b == 4) k = 2;else {
        this.fromRadix(s, b);
        return;
      }
    this.t = 0;
    this.s = 0;
    var i = s.length,
        mi = false,
        sh = 0;

    while (--i >= 0) {
      var x = k == 8 ? s[i] & 0xff : intAt(s, i);

      if (x < 0) {
        if (s.charAt(i) == "-") mi = true;
        continue;
      }

      mi = false;
      if (sh == 0) this[this.t++] = x;else if (sh + k > this.DB) {
        this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
        this[this.t++] = x >> this.DB - sh;
      } else this[this.t - 1] |= x << sh;
      sh += k;
      if (sh >= this.DB) sh -= this.DB;
    }

    if (k == 8 && (s[0] & 0x80) != 0) {
      this.s = -1;
      if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh;
    }

    this.clamp();
    if (mi) BigInteger.ZERO.subTo(this, this);
  } // (protected) clamp off excess high words


  function bnpClamp() {
    var c = this.s & this.DM;

    while (this.t > 0 && this[this.t - 1] == c) --this.t;
  } // (public) return string representation in given radix


  function bnToString(b) {
    if (this.s < 0) return "-" + this.negate().toString(b);
    var k;
    if (b == 16) k = 4;else if (b == 8) k = 3;else if (b == 2) k = 1;else if (b == 32) k = 5;else if (b == 4) k = 2;else return this.toRadix(b);
    var km = (1 << k) - 1,
        d,
        m = false,
        r = "",
        i = this.t;
    var p = this.DB - i * this.DB % k;

    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) > 0) {
        m = true;
        r = int2char(d);
      }

      while (i >= 0) {
        if (p < k) {
          d = (this[i] & (1 << p) - 1) << k - p;
          d |= this[--i] >> (p += this.DB - k);
        } else {
          d = this[i] >> (p -= k) & km;

          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }

        if (d > 0) m = true;
        if (m) r += int2char(d);
      }
    }

    return m ? r : "0";
  } // (public) -this


  function bnNegate() {
    var r = nbi();
    BigInteger.ZERO.subTo(this, r);
    return r;
  } // (public) |this|


  function bnAbs() {
    return this.s < 0 ? this.negate() : this;
  } // (public) return + if this > a, - if this < a, 0 if equal


  function bnCompareTo(a) {
    var r = this.s - a.s;
    if (r != 0) return r;
    var i = this.t;
    r = i - a.t;
    if (r != 0) return r;

    while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;

    return 0;
  } // returns bit length of the integer x


  function nbits(x) {
    var r = 1,
        t;

    if ((t = x >>> 16) != 0) {
      x = t;
      r += 16;
    }

    if ((t = x >> 8) != 0) {
      x = t;
      r += 8;
    }

    if ((t = x >> 4) != 0) {
      x = t;
      r += 4;
    }

    if ((t = x >> 2) != 0) {
      x = t;
      r += 2;
    }

    if ((t = x >> 1) != 0) {
      x = t;
      r += 1;
    }

    return r;
  } // (public) return the number of bits in "this"


  function bnBitLength() {
    if (this.t <= 0) return 0;
    return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
  } // (protected) r = this << n*DB


  function bnpDLShiftTo(n, r) {
    var i;

    for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];

    for (i = n - 1; i >= 0; --i) r[i] = 0;

    r.t = this.t + n;
    r.s = this.s;
  } // (protected) r = this >> n*DB


  function bnpDRShiftTo(n, r) {
    for (var i = n; i < this.t; ++i) r[i - n] = this[i];

    r.t = Math.max(this.t - n, 0);
    r.s = this.s;
  } // (protected) r = this << n


  function bnpLShiftTo(n, r) {
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << cbs) - 1;
    var ds = Math.floor(n / this.DB),
        c = this.s << bs & this.DM,
        i;

    for (i = this.t - 1; i >= 0; --i) {
      r[i + ds + 1] = this[i] >> cbs | c;
      c = (this[i] & bm) << bs;
    }

    for (i = ds - 1; i >= 0; --i) r[i] = 0;

    r[ds] = c;
    r.t = this.t + ds + 1;
    r.s = this.s;
    r.clamp();
  } // (protected) r = this >> n


  function bnpRShiftTo(n, r) {
    r.s = this.s;
    var ds = Math.floor(n / this.DB);

    if (ds >= this.t) {
      r.t = 0;
      return;
    }

    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << bs) - 1;
    r[0] = this[ds] >> bs;

    for (var i = ds + 1; i < this.t; ++i) {
      r[i - ds - 1] |= (this[i] & bm) << cbs;
      r[i - ds] = this[i] >> bs;
    }

    if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
    r.t = this.t - ds;
    r.clamp();
  } // (protected) r = this - a


  function bnpSubTo(a, r) {
    var i = 0,
        c = 0,
        m = Math.min(a.t, this.t);

    while (i < m) {
      c += this[i] - a[i];
      r[i++] = c & this.DM;
      c >>= this.DB;
    }

    if (a.t < this.t) {
      c -= a.s;

      while (i < this.t) {
        c += this[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c += this.s;
    } else {
      c += this.s;

      while (i < a.t) {
        c -= a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c -= a.s;
    }

    r.s = c < 0 ? -1 : 0;
    if (c < -1) r[i++] = this.DV + c;else if (c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  } // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.


  function bnpMultiplyTo(a, r) {
    var x = this.abs(),
        y = a.abs();
    var i = x.t;
    r.t = i + y.t;

    while (--i >= 0) r[i] = 0;

    for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);

    r.s = 0;
    r.clamp();
    if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
  } // (protected) r = this^2, r != this (HAC 14.16)


  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2 * x.t;

    while (--i >= 0) r[i] = 0;

    for (i = 0; i < x.t - 1; ++i) {
      var c = x.am(i, x[i], r, 2 * i, 0, 1);

      if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
        r[i + x.t] -= x.DV;
        r[i + x.t + 1] = 1;
      }
    }

    if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
    r.s = 0;
    r.clamp();
  } // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.


  function bnpDivRemTo(m, q, r) {
    var pm = m.abs();
    if (pm.t <= 0) return;
    var pt = this.abs();

    if (pt.t < pm.t) {
      if (q != null) q.fromInt(0);
      if (r != null) this.copyTo(r);
      return;
    }

    if (r == null) r = nbi();
    var y = nbi(),
        ts = this.s,
        ms = m.s;
    var nsh = this.DB - nbits(pm[pm.t - 1]); // normalize modulus

    if (nsh > 0) {
      pm.lShiftTo(nsh, y);
      pt.lShiftTo(nsh, r);
    } else {
      pm.copyTo(y);
      pt.copyTo(r);
    }

    var ys = y.t;
    var y0 = y[ys - 1];
    if (y0 == 0) return;
    var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
    var d1 = this.FV / yt,
        d2 = (1 << this.F1) / yt,
        e = 1 << this.F2;
    var i = r.t,
        j = i - ys,
        t = q == null ? nbi() : q;
    y.dlShiftTo(j, t);

    if (r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t, r);
    }

    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(y, y); // "negative" y so we can replace sub with am later

    while (y.t < ys) y[y.t++] = 0;

    while (--j >= 0) {
      // Estimate quotient digit
      var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);

      if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
        // Try it out
        y.dlShiftTo(j, t);
        r.subTo(t, r);

        while (r[i] < --qd) r.subTo(t, r);
      }
    }

    if (q != null) {
      r.drShiftTo(ys, q);
      if (ts != ms) BigInteger.ZERO.subTo(q, q);
    }

    r.t = ys;
    r.clamp();
    if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder

    if (ts < 0) BigInteger.ZERO.subTo(r, r);
  } // (public) this mod a


  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a, null, r);
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
    return r;
  } // Modular reduction using "classic" algorithm


  function Classic(m) {
    this.m = m;
  }

  function cConvert(x) {
    if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);else return x;
  }

  function cRevert(x) {
    return x;
  }

  function cReduce(x) {
    x.divRemTo(this.m, null, x);
  }

  function cMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }

  function cSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo; // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.

  function bnpInvDigit() {
    if (this.t < 1) return 0;
    var x = this[0];
    if ((x & 1) == 0) return 0;
    var y = x & 3; // y == 1/x mod 2^2

    y = y * (2 - (x & 0xf) * y) & 0xf; // y == 1/x mod 2^4

    y = y * (2 - (x & 0xff) * y) & 0xff; // y == 1/x mod 2^8

    y = y * (2 - ((x & 0xffff) * y & 0xffff)) & 0xffff; // y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints

    y = y * (2 - x * y % this.DV) % this.DV; // y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV

    return y > 0 ? this.DV - y : -y;
  } // Montgomery reduction


  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp & 0x7fff;
    this.mph = this.mp >> 15;
    this.um = (1 << m.DB - 15) - 1;
    this.mt2 = 2 * m.t;
  } // xR mod m


  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t, r);
    r.divRemTo(this.m, null, r);
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
    return r;
  } // x/R mod m


  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  } // x = x/R mod m (HAC 14.32)


  function montReduce(x) {
    while (x.t <= this.mt2) // pad x so am has enough room later
    x[x.t++] = 0;

    for (var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i] & 0x7fff;
      var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM; // use am to combine the multiply-shift-add into one call

      j = i + this.m.t;
      x[j] += this.m.am(0, u0, x, i, 0, this.m.t); // propagate carry

      while (x[j] >= x.DV) {
        x[j] -= x.DV;
        x[++j]++;
      }
    }

    x.clamp();
    x.drShiftTo(this.m.t, x);
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  } // r = "x^2/R mod m"; x != r


  function montSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  } // r = "xy/R mod m"; x,y != r


  function montMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo; // (protected) true iff this is even

  function bnpIsEven() {
    return (this.t > 0 ? this[0] & 1 : this.s) == 0;
  } // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)


  function bnpExp(e, z) {
    if (e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(),
        r2 = nbi(),
        g = z.convert(this),
        i = nbits(e) - 1;
    g.copyTo(r);

    while (--i >= 0) {
      z.sqrTo(r, r2);
      if ((e & 1 << i) > 0) z.mulTo(r2, g, r);else {
        var t = r;
        r = r2;
        r2 = t;
      }
    }

    return z.revert(r);
  } // (public) this^e % m, 0 <= e < 2^32


  function bnModPowInt(e, m) {
    var z;
    if (e < 256 || m.isEven()) z = new Classic(m);else z = new Montgomery(m);
    return this.exp(e, z);
  } // protected


  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp; // public

  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt; // "constants"

  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1); /// BEGIN jsbn2.js

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */
  // Extended JavaScript BN functions, required for RSA private ops.
  // (public)

  function bnClone() {
    var r = nbi();
    this.copyTo(r);
    return r;
  } // (public) return value as integer


  function bnIntValue() {
    if (this.s < 0) {
      if (this.t == 1) return this[0] - this.DV;else if (this.t == 0) return -1;
    } else if (this.t == 1) return this[0];else if (this.t == 0) return 0; // assumes 16 < DB < 32


    return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0];
  } // (public) return value as byte


  function bnByteValue() {
    return this.t == 0 ? this.s : this[0] << 24 >> 24;
  } // (public) return value as short (assumes DB>=16)


  function bnShortValue() {
    return this.t == 0 ? this.s : this[0] << 16 >> 16;
  } // (protected) return x s.t. r^x < DV


  function bnpChunkSize(r) {
    return Math.floor(Math.LN2 * this.DB / Math.log(r));
  } // (public) 0 if this == 0, 1 if this > 0


  function bnSigNum() {
    if (this.s < 0) return -1;else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0;else return 1;
  } // (protected) convert to radix string


  function bnpToRadix(b) {
    if (b == null) b = 10;
    if (this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b, cs);
    var d = nbv(a),
        y = nbi(),
        z = nbi(),
        r = "";
    this.divRemTo(d, y, z);

    while (y.signum() > 0) {
      r = (a + z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d, y, z);
    }

    return z.intValue().toString(b) + r;
  } // (protected) convert from radix string


  function bnpFromRadix(s, b) {
    this.fromInt(0);
    if (b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b, cs),
        mi = false,
        j = 0,
        w = 0;

    for (var i = 0; i < s.length; ++i) {
      var x = intAt(s, i);

      if (x < 0) {
        if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }

      w = b * w + x;

      if (++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w, 0);
        j = 0;
        w = 0;
      }
    }

    if (j > 0) {
      this.dMultiply(Math.pow(b, j));
      this.dAddOffset(w, 0);
    }

    if (mi) BigInteger.ZERO.subTo(this, this);
  } // (protected) alternate constructor


  function bnpFromNumber(a, b, c) {
    if ("number" == typeof b) {
      // new BigInteger(int,int,RNG)
      if (a < 2) this.fromInt(1);else {
        this.fromNumber(a, c);
        if (!this.testBit(a - 1)) // force MSB set
          this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
        if (this.isEven()) this.dAddOffset(1, 0); // force odd

        while (!this.isProbablePrime(b)) {
          this.dAddOffset(2, 0);
          if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
        }
      }
    } else {
      // new BigInteger(int,RNG)
      var x = new Array(),
          t = a & 7;
      x.length = (a >> 3) + 1;
      b.nextBytes(x);
      if (t > 0) x[0] &= (1 << t) - 1;else x[0] = 0;
      this.fromString(x, 256);
    }
  } // (public) convert to bigendian byte array


  function bnToByteArray() {
    var i = this.t,
        r = new Array();
    r[0] = this.s;
    var p = this.DB - i * this.DB % 8,
        d,
        k = 0;

    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p) r[k++] = d | this.s << this.DB - p;

      while (i >= 0) {
        if (p < 8) {
          d = (this[i] & (1 << p) - 1) << 8 - p;
          d |= this[--i] >> (p += this.DB - 8);
        } else {
          d = this[i] >> (p -= 8) & 0xff;

          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }

        if ((d & 0x80) != 0) d |= -256;
        if (k == 0 && (this.s & 0x80) != (d & 0x80)) ++k;
        if (k > 0 || d != this.s) r[k++] = d;
      }
    }

    return r;
  }

  function bnEquals(a) {
    return this.compareTo(a) == 0;
  }

  function bnMin(a) {
    return this.compareTo(a) < 0 ? this : a;
  }

  function bnMax(a) {
    return this.compareTo(a) > 0 ? this : a;
  } // (protected) r = this op a (bitwise)


  function bnpBitwiseTo(a, op, r) {
    var i,
        f,
        m = Math.min(a.t, this.t);

    for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);

    if (a.t < this.t) {
      f = a.s & this.DM;

      for (i = m; i < this.t; ++i) r[i] = op(this[i], f);

      r.t = this.t;
    } else {
      f = this.s & this.DM;

      for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);

      r.t = a.t;
    }

    r.s = op(this.s, a.s);
    r.clamp();
  } // (public) this & a


  function op_and(x, y) {
    return x & y;
  }

  function bnAnd(a) {
    var r = nbi();
    this.bitwiseTo(a, op_and, r);
    return r;
  } // (public) this | a


  function op_or(x, y) {
    return x | y;
  }

  function bnOr(a) {
    var r = nbi();
    this.bitwiseTo(a, op_or, r);
    return r;
  } // (public) this ^ a


  function op_xor(x, y) {
    return x ^ y;
  }

  function bnXor(a) {
    var r = nbi();
    this.bitwiseTo(a, op_xor, r);
    return r;
  } // (public) this & ~a


  function op_andnot(x, y) {
    return x & ~y;
  }

  function bnAndNot(a) {
    var r = nbi();
    this.bitwiseTo(a, op_andnot, r);
    return r;
  } // (public) ~this


  function bnNot() {
    var r = nbi();

    for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];

    r.t = this.t;
    r.s = ~this.s;
    return r;
  } // (public) this << n


  function bnShiftLeft(n) {
    var r = nbi();
    if (n < 0) this.rShiftTo(-n, r);else this.lShiftTo(n, r);
    return r;
  } // (public) this >> n


  function bnShiftRight(n) {
    var r = nbi();
    if (n < 0) this.lShiftTo(-n, r);else this.rShiftTo(n, r);
    return r;
  } // return index of lowest 1-bit in x, x < 2^31


  function lbit(x) {
    if (x == 0) return -1;
    var r = 0;

    if ((x & 0xffff) == 0) {
      x >>= 16;
      r += 16;
    }

    if ((x & 0xff) == 0) {
      x >>= 8;
      r += 8;
    }

    if ((x & 0xf) == 0) {
      x >>= 4;
      r += 4;
    }

    if ((x & 3) == 0) {
      x >>= 2;
      r += 2;
    }

    if ((x & 1) == 0) ++r;
    return r;
  } // (public) returns index of lowest 1-bit (or -1 if none)


  function bnGetLowestSetBit() {
    for (var i = 0; i < this.t; ++i) if (this[i] != 0) return i * this.DB + lbit(this[i]);

    if (this.s < 0) return this.t * this.DB;
    return -1;
  } // return number of 1 bits in x


  function cbit(x) {
    var r = 0;

    while (x != 0) {
      x &= x - 1;
      ++r;
    }

    return r;
  } // (public) return number of set bits


  function bnBitCount() {
    var r = 0,
        x = this.s & this.DM;

    for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);

    return r;
  } // (public) true iff nth bit is set


  function bnTestBit(n) {
    var j = Math.floor(n / this.DB);
    if (j >= this.t) return this.s != 0;
    return (this[j] & 1 << n % this.DB) != 0;
  } // (protected) this op (1<<n)


  function bnpChangeBit(n, op) {
    var r = BigInteger.ONE.shiftLeft(n);
    this.bitwiseTo(r, op, r);
    return r;
  } // (public) this | (1<<n)


  function bnSetBit(n) {
    return this.changeBit(n, op_or);
  } // (public) this & ~(1<<n)


  function bnClearBit(n) {
    return this.changeBit(n, op_andnot);
  } // (public) this ^ (1<<n)


  function bnFlipBit(n) {
    return this.changeBit(n, op_xor);
  } // (protected) r = this + a


  function bnpAddTo(a, r) {
    var i = 0,
        c = 0,
        m = Math.min(a.t, this.t);

    while (i < m) {
      c += this[i] + a[i];
      r[i++] = c & this.DM;
      c >>= this.DB;
    }

    if (a.t < this.t) {
      c += a.s;

      while (i < this.t) {
        c += this[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c += this.s;
    } else {
      c += this.s;

      while (i < a.t) {
        c += a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c += a.s;
    }

    r.s = c < 0 ? -1 : 0;
    if (c > 0) r[i++] = c;else if (c < -1) r[i++] = this.DV + c;
    r.t = i;
    r.clamp();
  } // (public) this + a


  function bnAdd(a) {
    var r = nbi();
    this.addTo(a, r);
    return r;
  } // (public) this - a


  function bnSubtract(a) {
    var r = nbi();
    this.subTo(a, r);
    return r;
  } // (public) this * a


  function bnMultiply(a) {
    var r = nbi();
    this.multiplyTo(a, r);
    return r;
  } // (public) this / a


  function bnDivide(a) {
    var r = nbi();
    this.divRemTo(a, r, null);
    return r;
  } // (public) this % a


  function bnRemainder(a) {
    var r = nbi();
    this.divRemTo(a, null, r);
    return r;
  } // (public) [this/a,this%a]


  function bnDivideAndRemainder(a) {
    var q = nbi(),
        r = nbi();
    this.divRemTo(a, q, r);
    return new Array(q, r);
  } // (protected) this *= n, this >= 0, 1 < n < DV


  function bnpDMultiply(n) {
    this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;
    this.clamp();
  } // (protected) this += n << w words, this >= 0


  function bnpDAddOffset(n, w) {
    while (this.t <= w) this[this.t++] = 0;

    this[w] += n;

    while (this[w] >= this.DV) {
      this[w] -= this.DV;
      if (++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  } // A "null" reducer


  function NullExp() {}

  function nNop(x) {
    return x;
  }

  function nMulTo(x, y, r) {
    x.multiplyTo(y, r);
  }

  function nSqrTo(x, r) {
    x.squareTo(r);
  }

  NullExp.prototype.convert = nNop;
  NullExp.prototype.revert = nNop;
  NullExp.prototype.mulTo = nMulTo;
  NullExp.prototype.sqrTo = nSqrTo; // (public) this^e

  function bnPow(e) {
    return this.exp(e, new NullExp());
  } // (protected) r = lower n words of "this * a", a.t <= n
  // "this" should be the larger one if appropriate.


  function bnpMultiplyLowerTo(a, n, r) {
    var i = Math.min(this.t + a.t, n);
    r.s = 0; // assumes a,this >= 0

    r.t = i;

    while (i > 0) r[--i] = 0;

    var j;

    for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);

    for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);

    r.clamp();
  } // (protected) r = "this * a" without lower n words, n > 0
  // "this" should be the larger one if appropriate.


  function bnpMultiplyUpperTo(a, n, r) {
    --n;
    var i = r.t = this.t + a.t - n;
    r.s = 0; // assumes a,this >= 0

    while (--i >= 0) r[i] = 0;

    for (i = Math.max(n - this.t, 0); i < a.t; ++i) r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);

    r.clamp();
    r.drShiftTo(1, r);
  } // Barrett modular reduction


  function Barrett(m) {
    // setup Barrett
    this.r2 = nbi();
    this.q3 = nbi();
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
    this.mu = this.r2.divide(m);
    this.m = m;
  }

  function barrettConvert(x) {
    if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);else if (x.compareTo(this.m) < 0) return x;else {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }
  }

  function barrettRevert(x) {
    return x;
  } // x = x mod m (HAC 14.42)


  function barrettReduce(x) {
    x.drShiftTo(this.m.t - 1, this.r2);

    if (x.t > this.m.t + 1) {
      x.t = this.m.t + 1;
      x.clamp();
    }

    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);

    while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);

    x.subTo(this.r2, x);

    while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  } // r = x^2 mod m; x != r


  function barrettSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  } // r = x*y mod m; x,y != r


  function barrettMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }

  Barrett.prototype.convert = barrettConvert;
  Barrett.prototype.revert = barrettRevert;
  Barrett.prototype.reduce = barrettReduce;
  Barrett.prototype.mulTo = barrettMulTo;
  Barrett.prototype.sqrTo = barrettSqrTo; // (public) this^e % m (HAC 14.85)

  function bnModPow(e, m) {
    var i = e.bitLength(),
        k,
        r = nbv(1),
        z;
    if (i <= 0) return r;else if (i < 18) k = 1;else if (i < 48) k = 3;else if (i < 144) k = 4;else if (i < 768) k = 5;else k = 6;
    if (i < 8) z = new Classic(m);else if (m.isEven()) z = new Barrett(m);else z = new Montgomery(m); // precomputation

    var g = new Array(),
        n = 3,
        k1 = k - 1,
        km = (1 << k) - 1;
    g[1] = z.convert(this);

    if (k > 1) {
      var g2 = nbi();
      z.sqrTo(g[1], g2);

      while (n <= km) {
        g[n] = nbi();
        z.mulTo(g2, g[n - 2], g[n]);
        n += 2;
      }
    }

    var j = e.t - 1,
        w,
        is1 = true,
        r2 = nbi(),
        t;
    i = nbits(e[j]) - 1;

    while (j >= 0) {
      if (i >= k1) w = e[j] >> i - k1 & km;else {
        w = (e[j] & (1 << i + 1) - 1) << k1 - i;
        if (j > 0) w |= e[j - 1] >> this.DB + i - k1;
      }
      n = k;

      while ((w & 1) == 0) {
        w >>= 1;
        --n;
      }

      if ((i -= n) < 0) {
        i += this.DB;
        --j;
      }

      if (is1) {
        // ret == 1, don't bother squaring or multiplying it
        g[w].copyTo(r);
        is1 = false;
      } else {
        while (n > 1) {
          z.sqrTo(r, r2);
          z.sqrTo(r2, r);
          n -= 2;
        }

        if (n > 0) z.sqrTo(r, r2);else {
          t = r;
          r = r2;
          r2 = t;
        }
        z.mulTo(r2, g[w], r);
      }

      while (j >= 0 && (e[j] & 1 << i) == 0) {
        z.sqrTo(r, r2);
        t = r;
        r = r2;
        r2 = t;

        if (--i < 0) {
          i = this.DB - 1;
          --j;
        }
      }
    }

    return z.revert(r);
  } // (public) gcd(this,a) (HAC 14.54)


  function bnGCD(a) {
    var x = this.s < 0 ? this.negate() : this.clone();
    var y = a.s < 0 ? a.negate() : a.clone();

    if (x.compareTo(y) < 0) {
      var t = x;
      x = y;
      y = t;
    }

    var i = x.getLowestSetBit(),
        g = y.getLowestSetBit();
    if (g < 0) return x;
    if (i < g) g = i;

    if (g > 0) {
      x.rShiftTo(g, x);
      y.rShiftTo(g, y);
    }

    while (x.signum() > 0) {
      if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
      if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);

      if (x.compareTo(y) >= 0) {
        x.subTo(y, x);
        x.rShiftTo(1, x);
      } else {
        y.subTo(x, y);
        y.rShiftTo(1, y);
      }
    }

    if (g > 0) y.lShiftTo(g, y);
    return y;
  } // (protected) this % n, n < 2^26


  function bnpModInt(n) {
    if (n <= 0) return 0;
    var d = this.DV % n,
        r = this.s < 0 ? n - 1 : 0;
    if (this.t > 0) if (d == 0) r = this[0] % n;else for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
    return r;
  } // (public) 1/this % m (HAC 14.61)


  function bnModInverse(m) {
    var ac = m.isEven();
    if (this.isEven() && ac || m.signum() == 0) return BigInteger.ZERO;
    var u = m.clone(),
        v = this.clone();
    var a = nbv(1),
        b = nbv(0),
        c = nbv(0),
        d = nbv(1);

    while (u.signum() != 0) {
      while (u.isEven()) {
        u.rShiftTo(1, u);

        if (ac) {
          if (!a.isEven() || !b.isEven()) {
            a.addTo(this, a);
            b.subTo(m, b);
          }

          a.rShiftTo(1, a);
        } else if (!b.isEven()) b.subTo(m, b);

        b.rShiftTo(1, b);
      }

      while (v.isEven()) {
        v.rShiftTo(1, v);

        if (ac) {
          if (!c.isEven() || !d.isEven()) {
            c.addTo(this, c);
            d.subTo(m, d);
          }

          c.rShiftTo(1, c);
        } else if (!d.isEven()) d.subTo(m, d);

        d.rShiftTo(1, d);
      }

      if (u.compareTo(v) >= 0) {
        u.subTo(v, u);
        if (ac) a.subTo(c, a);
        b.subTo(d, b);
      } else {
        v.subTo(u, v);
        if (ac) c.subTo(a, c);
        d.subTo(b, d);
      }
    }

    if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
    if (d.compareTo(m) >= 0) return d.subtract(m);
    if (d.signum() < 0) d.addTo(m, d);else return d;
    if (d.signum() < 0) return d.add(m);else return d;
  }

  var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509];
  var lplim = (1 << 26) / lowprimes[lowprimes.length - 1]; // (public) test primality with certainty >= 1-.5^t

  function bnIsProbablePrime(t) {
    var i,
        x = this.abs();

    if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
      for (i = 0; i < lowprimes.length; ++i) if (x[0] == lowprimes[i]) return true;

      return false;
    }

    if (x.isEven()) return false;
    i = 1;

    while (i < lowprimes.length) {
      var m = lowprimes[i],
          j = i + 1;

      while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];

      m = x.modInt(m);

      while (i < j) if (m % lowprimes[i++] == 0) return false;
    }

    return x.millerRabin(t);
  } // (protected) true if probably prime (HAC 4.24, Miller-Rabin)


  function bnpMillerRabin(t) {
    var n1 = this.subtract(BigInteger.ONE);
    var k = n1.getLowestSetBit();
    if (k <= 0) return false;
    var r = n1.shiftRight(k);
    t = t + 1 >> 1;
    if (t > lowprimes.length) t = lowprimes.length;
    var a = nbi();

    for (var i = 0; i < t; ++i) {
      a.fromInt(lowprimes[i]);
      var y = a.modPow(r, this);

      if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
        var j = 1;

        while (j++ < k && y.compareTo(n1) != 0) {
          y = y.modPowInt(2, this);
          if (y.compareTo(BigInteger.ONE) == 0) return false;
        }

        if (y.compareTo(n1) != 0) return false;
      }
    }

    return true;
  } // protected


  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.fromNumber = bnpFromNumber;
  BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
  BigInteger.prototype.changeBit = bnpChangeBit;
  BigInteger.prototype.addTo = bnpAddTo;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
  BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
  BigInteger.prototype.modInt = bnpModInt;
  BigInteger.prototype.millerRabin = bnpMillerRabin; // public

  BigInteger.prototype.clone = bnClone;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.byteValue = bnByteValue;
  BigInteger.prototype.shortValue = bnShortValue;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.toByteArray = bnToByteArray;
  BigInteger.prototype.equals = bnEquals;
  BigInteger.prototype.min = bnMin;
  BigInteger.prototype.max = bnMax;
  BigInteger.prototype.and = bnAnd;
  BigInteger.prototype.or = bnOr;
  BigInteger.prototype.xor = bnXor;
  BigInteger.prototype.andNot = bnAndNot;
  BigInteger.prototype.not = bnNot;
  BigInteger.prototype.shiftLeft = bnShiftLeft;
  BigInteger.prototype.shiftRight = bnShiftRight;
  BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
  BigInteger.prototype.bitCount = bnBitCount;
  BigInteger.prototype.testBit = bnTestBit;
  BigInteger.prototype.setBit = bnSetBit;
  BigInteger.prototype.clearBit = bnClearBit;
  BigInteger.prototype.flipBit = bnFlipBit;
  BigInteger.prototype.add = bnAdd;
  BigInteger.prototype.subtract = bnSubtract;
  BigInteger.prototype.multiply = bnMultiply;
  BigInteger.prototype.divide = bnDivide;
  BigInteger.prototype.remainder = bnRemainder;
  BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
  BigInteger.prototype.modPow = bnModPow;
  BigInteger.prototype.modInverse = bnModInverse;
  BigInteger.prototype.pow = bnPow;
  BigInteger.prototype.gcd = bnGCD;
  BigInteger.prototype.isProbablePrime = bnIsProbablePrime; // BigInteger interfaces not implemented in jsbn:
  // BigInteger(int signum, byte[] magnitude)
  // double doubleValue()
  // float floatValue()
  // int hashCode()
  // long longValue()
  // static BigInteger valueOf(long val)
  /// METEOR WRAPPER

  return BigInteger;
}());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/srp/srp.js");

/* Exports */
Package._define("srp", exports, {
  SRP: SRP
});

})();

//# sourceURL=meteor://💻app/packages/srp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3JwL3NycC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3JwL2JpZ2ludGVnZXIuanMiXSwibmFtZXMiOlsiX29iamVjdFNwcmVhZCIsIm1vZHVsZSIsImxpbmsiLCJkZWZhdWx0IiwidiIsImV4cG9ydCIsIlNSUCIsIlJhbmRvbSIsIkJpZ0ludGVnZXIiLCJnZW5lcmF0ZVZlcmlmaWVyIiwicGFzc3dvcmQiLCJvcHRpb25zIiwicGFyYW1zIiwicGFyYW1zRnJvbU9wdGlvbnMiLCJzYWx0Iiwic2VjcmV0IiwiaWRlbnRpdHkiLCJoYXNoZWRJZGVudGl0eUFuZFBhc3N3b3JkIiwiaGFzaCIsIngiLCJ4aSIsImciLCJtb2RQb3ciLCJOIiwidmVyaWZpZXIiLCJ0b1N0cmluZyIsIm1hdGNoVmVyaWZpZXIiLCJTdHJpbmciLCJfZGVmYXVsdHMiLCJTSEEyNTYiLCJ0b0xvd2VyQ2FzZSIsImsiLCJyZXQiLCJmb3JFYWNoIiwicCIsIkVycm9yIiwiZXhwb3J0RGVmYXVsdCIsImRiaXRzIiwiY2FuYXJ5Iiwial9sbSIsImEiLCJiIiwiYyIsImZyb21OdW1iZXIiLCJmcm9tU3RyaW5nIiwibmJpIiwiYW0xIiwiaSIsInciLCJqIiwibiIsIk1hdGgiLCJmbG9vciIsImFtMiIsInhsIiwieGgiLCJsIiwiaCIsIm0iLCJhbTMiLCJwcm90b3R5cGUiLCJhbSIsIkRCIiwiRE0iLCJEViIsIkJJX0ZQIiwiRlYiLCJwb3ciLCJGMSIsIkYyIiwiQklfUk0iLCJCSV9SQyIsIkFycmF5IiwicnIiLCJ2diIsImNoYXJDb2RlQXQiLCJpbnQyY2hhciIsImNoYXJBdCIsImludEF0IiwicyIsImJucENvcHlUbyIsInIiLCJ0IiwiYm5wRnJvbUludCIsIm5idiIsImZyb21JbnQiLCJibnBGcm9tU3RyaW5nIiwiZnJvbVJhZGl4IiwibGVuZ3RoIiwibWkiLCJzaCIsImNsYW1wIiwiWkVSTyIsInN1YlRvIiwiYm5wQ2xhbXAiLCJiblRvU3RyaW5nIiwibmVnYXRlIiwidG9SYWRpeCIsImttIiwiZCIsImJuTmVnYXRlIiwiYm5BYnMiLCJibkNvbXBhcmVUbyIsIm5iaXRzIiwiYm5CaXRMZW5ndGgiLCJibnBETFNoaWZ0VG8iLCJibnBEUlNoaWZ0VG8iLCJtYXgiLCJibnBMU2hpZnRUbyIsImJzIiwiY2JzIiwiYm0iLCJkcyIsImJucFJTaGlmdFRvIiwiYm5wU3ViVG8iLCJtaW4iLCJibnBNdWx0aXBseVRvIiwiYWJzIiwieSIsImJucFNxdWFyZVRvIiwiYm5wRGl2UmVtVG8iLCJxIiwicG0iLCJwdCIsImNvcHlUbyIsInRzIiwibXMiLCJuc2giLCJsU2hpZnRUbyIsInlzIiwieTAiLCJ5dCIsImQxIiwiZDIiLCJlIiwiZGxTaGlmdFRvIiwiY29tcGFyZVRvIiwiT05FIiwicWQiLCJkclNoaWZ0VG8iLCJyU2hpZnRUbyIsImJuTW9kIiwiZGl2UmVtVG8iLCJDbGFzc2ljIiwiY0NvbnZlcnQiLCJtb2QiLCJjUmV2ZXJ0IiwiY1JlZHVjZSIsImNNdWxUbyIsIm11bHRpcGx5VG8iLCJyZWR1Y2UiLCJjU3FyVG8iLCJzcXVhcmVUbyIsImNvbnZlcnQiLCJyZXZlcnQiLCJtdWxUbyIsInNxclRvIiwiYm5wSW52RGlnaXQiLCJNb250Z29tZXJ5IiwibXAiLCJpbnZEaWdpdCIsIm1wbCIsIm1waCIsInVtIiwibXQyIiwibW9udENvbnZlcnQiLCJtb250UmV2ZXJ0IiwibW9udFJlZHVjZSIsInUwIiwibW9udFNxclRvIiwibW9udE11bFRvIiwiYm5wSXNFdmVuIiwiYm5wRXhwIiwieiIsInIyIiwiYm5Nb2RQb3dJbnQiLCJpc0V2ZW4iLCJleHAiLCJiaXRMZW5ndGgiLCJtb2RQb3dJbnQiLCJibkNsb25lIiwiYm5JbnRWYWx1ZSIsImJuQnl0ZVZhbHVlIiwiYm5TaG9ydFZhbHVlIiwiYm5wQ2h1bmtTaXplIiwiTE4yIiwibG9nIiwiYm5TaWdOdW0iLCJibnBUb1JhZGl4Iiwic2lnbnVtIiwiY3MiLCJjaHVua1NpemUiLCJpbnRWYWx1ZSIsInN1YnN0ciIsImJucEZyb21SYWRpeCIsImRNdWx0aXBseSIsImRBZGRPZmZzZXQiLCJibnBGcm9tTnVtYmVyIiwidGVzdEJpdCIsImJpdHdpc2VUbyIsInNoaWZ0TGVmdCIsIm9wX29yIiwiaXNQcm9iYWJsZVByaW1lIiwibmV4dEJ5dGVzIiwiYm5Ub0J5dGVBcnJheSIsImJuRXF1YWxzIiwiYm5NaW4iLCJibk1heCIsImJucEJpdHdpc2VUbyIsIm9wIiwiZiIsIm9wX2FuZCIsImJuQW5kIiwiYm5PciIsIm9wX3hvciIsImJuWG9yIiwib3BfYW5kbm90IiwiYm5BbmROb3QiLCJibk5vdCIsImJuU2hpZnRMZWZ0IiwiYm5TaGlmdFJpZ2h0IiwibGJpdCIsImJuR2V0TG93ZXN0U2V0Qml0IiwiY2JpdCIsImJuQml0Q291bnQiLCJiblRlc3RCaXQiLCJibnBDaGFuZ2VCaXQiLCJiblNldEJpdCIsImNoYW5nZUJpdCIsImJuQ2xlYXJCaXQiLCJibkZsaXBCaXQiLCJibnBBZGRUbyIsImJuQWRkIiwiYWRkVG8iLCJiblN1YnRyYWN0IiwiYm5NdWx0aXBseSIsImJuRGl2aWRlIiwiYm5SZW1haW5kZXIiLCJibkRpdmlkZUFuZFJlbWFpbmRlciIsImJucERNdWx0aXBseSIsImJucERBZGRPZmZzZXQiLCJOdWxsRXhwIiwibk5vcCIsIm5NdWxUbyIsIm5TcXJUbyIsImJuUG93IiwiYm5wTXVsdGlwbHlMb3dlclRvIiwiYm5wTXVsdGlwbHlVcHBlclRvIiwiQmFycmV0dCIsInEzIiwibXUiLCJkaXZpZGUiLCJiYXJyZXR0Q29udmVydCIsImJhcnJldHRSZXZlcnQiLCJiYXJyZXR0UmVkdWNlIiwibXVsdGlwbHlVcHBlclRvIiwibXVsdGlwbHlMb3dlclRvIiwiYmFycmV0dFNxclRvIiwiYmFycmV0dE11bFRvIiwiYm5Nb2RQb3ciLCJrMSIsImcyIiwiaXMxIiwiYm5HQ0QiLCJjbG9uZSIsImdldExvd2VzdFNldEJpdCIsImJucE1vZEludCIsImJuTW9kSW52ZXJzZSIsImFjIiwidSIsInN1YnRyYWN0IiwiYWRkIiwibG93cHJpbWVzIiwibHBsaW0iLCJibklzUHJvYmFibGVQcmltZSIsIm1vZEludCIsIm1pbGxlclJhYmluIiwiYm5wTWlsbGVyUmFiaW4iLCJuMSIsInNoaWZ0UmlnaHQiLCJieXRlVmFsdWUiLCJzaG9ydFZhbHVlIiwidG9CeXRlQXJyYXkiLCJlcXVhbHMiLCJhbmQiLCJvciIsInhvciIsImFuZE5vdCIsIm5vdCIsImJpdENvdW50Iiwic2V0Qml0IiwiY2xlYXJCaXQiLCJmbGlwQml0IiwibXVsdGlwbHkiLCJyZW1haW5kZXIiLCJkaXZpZGVBbmRSZW1haW5kZXIiLCJtb2RJbnZlcnNlIiwiZ2NkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsYUFBSjs7QUFBa0JDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLHNDQUFaLEVBQW1EO0FBQUNDLFNBQU8sQ0FBQ0MsQ0FBRCxFQUFHO0FBQUNKLGlCQUFhLEdBQUNJLENBQWQ7QUFBZ0I7O0FBQTVCLENBQW5ELEVBQWlGLENBQWpGO0FBQWxCSCxNQUFNLENBQUNJLE1BQVAsQ0FBYztBQUFDQyxLQUFHLEVBQUMsTUFBSUE7QUFBVCxDQUFkO0FBQTZCLElBQUlDLE1BQUo7QUFBV04sTUFBTSxDQUFDQyxJQUFQLENBQVksZUFBWixFQUE0QjtBQUFDSyxRQUFNLENBQUNILENBQUQsRUFBRztBQUFDRyxVQUFNLEdBQUNILENBQVA7QUFBUzs7QUFBcEIsQ0FBNUIsRUFBa0QsQ0FBbEQ7QUFBcUQsSUFBSUksVUFBSjtBQUFlUCxNQUFNLENBQUNDLElBQVAsQ0FBWSxjQUFaLEVBQTJCO0FBQUNDLFNBQU8sQ0FBQ0MsQ0FBRCxFQUFHO0FBQUNJLGNBQVUsR0FBQ0osQ0FBWDtBQUFhOztBQUF6QixDQUEzQixFQUFzRCxDQUF0RDtBQVVyRyxNQUFNRSxHQUFHLEdBQUcsRUFBWjs7QUFFUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0FBLEdBQUcsQ0FBQ0csZ0JBQUosR0FBdUIsVUFB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R0FBOEIvRCxRQUE5QjtBQUNBM04sWUFBVSxDQUFDb0QsU0FBWCxDQUFxQnVPLFFBQXJCLEdBQWdDOUQsVUFBaEM7QUFDQTdOLFlBQVUsQ0FBQ29ELFNBQVgsQ0FBcUJ3TyxPQUFyQixHQUErQjlELFNBQS9CO0FBQ0E5TixZQUFVLENBQUNvRCxTQUFYLENBQXFCbU4sR0FBckIsR0FBMkJ2QyxLQUEzQjtBQUNBaE8sWUFBVSxDQUFDb0QsU0FBWCxDQUFxQmtOLFFBQXJCLEdBQWdDcEMsVUFBaEM7QUFDQWxPLFlBQVUsQ0FBQ29ELFNBQVgsQ0FBcUJ5TyxRQUFyQixHQUFnQzFELFVBQWhDO0FBQ0FuTyxZQUFVLENBQUNvRCxTQUFYLENBQXFCK0wsTUFBckIsR0FBOEJmLFFBQTlCO0FBQ0FwTyxZQUFVLENBQUNvRCxTQUFYLENBQXFCME8sU0FBckIsR0FBaUN6RCxXQUFqQztBQUNBck8sWUFBVSxDQUFDb0QsU0FBWCxDQUFxQjJPLGtCQUFyQixHQUEwQ3pELG9CQUExQztBQUNBdE8sWUFBVSxDQUFDb0QsU0FBWCxDQUFxQnRDLE1BQXJCLEdBQThCNk8sUUFBOUI7QUFDQTNQLFlBQVUsQ0FBQ29ELFNBQVgsQ0FBcUI0TyxVQUFyQixHQUFrQzdCLFlBQWxDO0FBQ0FuUSxZQUFVLENBQUNvRCxTQUFYLENBQXFCTyxHQUFyQixHQUEyQmtMLEtBQTNCO0FBQ0E3TyxZQUFVLENBQUNvRCxTQUFYLENBQXFCNk8sR0FBckIsR0FBMkJsQyxLQUEzQjtBQUNBL1AsWUFBVSxDQUFDb0QsU0FBWCxDQUFxQjhJLGVBQXJCLEdBQXVDd0UsaUJBQXZDLENBOXVDeUMsQ0FndkN6QztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBOztBQUNBLFNBQU8xUSxVQUFQO0FBQ0MsQ0EzdkMyQixFQUQ1QixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9zcnAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCBCaWdJbnRlZ2VyIGZyb20gJy4vYmlnaW50ZWdlcic7XG5cbi8vIFRoaXMgcGFja2FnZSBjb250YWlucyBqdXN0IGVub3VnaCBvZiB0aGUgb3JpZ2luYWwgU1JQIGNvZGUgdG9cbi8vIHN1cHBvcnQgdGhlIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IHVwZ3JhZGUgcGF0aC5cbi8vXG4vLyBBbiBTUlAgKGFuZCBwb3NzaWJseSBhbHNvIGFjY291bnRzLXNycCkgcGFja2FnZSBzaG91bGQgZXZlbnR1YWxseSBiZVxuLy8gYXZhaWxhYmxlIGluIEF0bW9zcGhlcmUgc28gdGhhdCB1c2VycyBjYW4gY29udGludWUgdG8gdXNlIFNSUCBpZiB0aGV5XG4vLyB3YW50IHRvLlxuXG5leHBvcnQgY29uc3QgU1JQID0ge307XG5cbi8qKlxuICogR2VuZXJhdGUgYSBuZXcgU1JQIHZlcmlmaWVyLiBQYXNzd29yZCBpcyB0aGUgcGxhaW50ZXh0IHBhc3N3b3JkLlxuICpcbiAqIG9wdGlvbnMgaXMgb3B0aW9uYWwgYW5kIGNhbiBpbmNsdWRlOlxuICogLSBpZGVudGl0eTogU3RyaW5nLiBUaGUgU1JQIHVzZXJuYW1lIHRvIHVzZXIuIE1vc3RseSB0aGlzIGlzIHBhc3NlZFxuICogICBpbiBmb3IgdGVzdGluZy4gIFJhbmRvbSBVVUlEIGlmIG5vdCBwcm92aWRlZC5cbiAqIC0gaGFzaGVkSWRlbnRpdHlBbmRQYXNzd29yZDogY29tYmluZWQgaWRlbnRpdHkgYW5kIHBhc3N3b3JkLCBhbHJlYWR5IGhhc2hlZCwgZm9yIHRoZSBTUlAgdG8gYmNyeXB0IHVwZ3JhZGUgcGF0aC5cbiAqIC0gc2FsdDogU3RyaW5nLiBBIHNhbHQgdG8gdXNlLiAgTW9zdGx5IHRoaXMgaXMgcGFzc2VkIGluIGZvclxuICogICB0ZXN0aW5nLiAgUmFuZG9tIFVVSUQgaWYgbm90IHByb3ZpZGVkLlxuICogLSBTUlAgcGFyYW1ldGVycyAoc2VlIF9kZWZhdWx0cyBhbmQgcGFyYW1zRnJvbU9wdGlvbnMgYmVsb3cpXG4gKi9cblNSUC5nZW5lcmF0ZVZlcmlmaWVyID0gZnVuY3Rpb24gKHBhc3N3b3JkLCBvcHRpb25zKSB7XG4gIGNvbnN0IHBhcmFtcyA9IHBhcmFtc0Zyb21PcHRpb25zKG9wdGlvbnMpO1xuXG4gIGNvbnN0IHNhbHQgPSAob3B0aW9ucyAmJiBvcHRpb25zLnNhbHQpIHx8IFJhbmRvbS5zZWNyZXQoKTtcblxuICBsZXQgaWRlbnRpdHk7XG4gIGxldCBoYXNoZWRJZGVudGl0eUFuZFBhc3N3b3JkID0gb3B0aW9ucyAmJiBvcHRpb25zLmhhc2hlZElkZW50aXR5QW5kUGFzc3dvcmQ7XG4gIGlmICghaGFzaGVkSWRlbnRpdHlBbmRQYXNzd29yZCkge1xuICAgIGlkZW50aXR5ID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5pZGVudGl0eSkgfHwgUmFuZG9tLnNlY3JldCgpO1xuICAgIGhhc2hlZElkZW50aXR5QW5kUGFzc3dvcmQgPSBwYXJhbXMuaGFzaChpZGVudGl0eSArIFwiOlwiICsgcGFzc3dvcmQpO1xuICB9XG5cbiAgY29uc3QgeCA9IHBhcmFtcy5oYXNoKHNhbHQgKyBoYXNoZWRJZGVudGl0eUFuZFBhc3N3b3JkKTtcbiAgY29uc3QgeGkgPSBuZXcgQmlnSW50ZWdlcih4LCAxNik7XG4gIGNvbnN0IHYgPSBwYXJhbXMuZy5tb2RQb3coeGksIHBhcmFtcy5OKTtcblxuICByZXR1cm4ge1xuICAgIGlkZW50aXR5LFxuICAgIHNhbHQsXG4gICAgdmVyaWZpZXI6IHYudG9TdHJpbmcoMTYpXG4gIH07XG59O1xuXG4vLyBGb3IgdXNlIHdpdGggY2hlY2soKS5cblNSUC5tYXRjaFZlcmlmaWVyID0ge1xuICBpZGVudGl0eTogU3RyaW5nLFxuICBzYWx0OiBTdHJpbmcsXG4gIHZlcmlmaWVyOiBTdHJpbmdcbn07XG5cblxuLyoqXG4gKiBEZWZhdWx0IHBhcmFtZXRlciB2YWx1ZXMgZm9yIFNSUC5cbiAqXG4gKi9cbmNvbnN0IF9kZWZhdWx0cyA9IHtcbiAgaGFzaDogeCA9PiBTSEEyNTYoeCkudG9Mb3dlckNhc2UoKSxcbiAgTjogbmV3IEJpZ0ludGVnZXIoXCJFRUFGMEFCOUFEQjM4REQ2OUMzM0Y4MEFGQThGQzVFODYwNzI2MTg3NzVGRjNDMEI5RUEyMzE0QzlDMjU2NTc2RDY3NERGNzQ5NkVBODFEMzM4M0I0ODEzRDY5MkM2RTBFMEQ1RDhFMjUwQjk4QkU0OEU0OTVDMUQ2MDg5REFEMTVEQzdEN0I0NjE1NEQ2QjZDRThFRjRBRDY5QjE1RDQ5ODI1NTlCMjk3QkNGMTg4NUM1MjlGNTY2NjYwRTU3RUM2OEVEQkMzQzA1NzI2Q0MwMkZENENCRjQ5NzZFQUE5QUZENTEzOEZFODM3NjQzNUI5RkM2MUQyRkMwRUIwNkUzXCIsIDE2KSxcbiAgZzogbmV3IEJpZ0ludGVnZXIoXCIyXCIpXG59O1xuXG5fZGVmYXVsdHMuayA9IG5ldyBCaWdJbnRlZ2VyKFxuICBfZGVmYXVsdHMuaGFzaChcbiAgICBfZGVmYXVsdHMuTi50b1N0cmluZygxNikgK1xuICAgICAgX2RlZmF1bHRzLmcudG9TdHJpbmcoMTYpKSxcbiAgMTYpO1xuXG4vKipcbiAqIFByb2Nlc3MgYW4gb3B0aW9ucyBoYXNoIHRvIGNyZWF0ZSBTUlAgcGFyYW1ldGVycy5cbiAqXG4gKiBPcHRpb25zIGNhbiBpbmNsdWRlOlxuICogLSBoYXNoOiBGdW5jdGlvbi4gRGVmYXVsdHMgdG8gU0hBMjU2LlxuICogLSBOOiBTdHJpbmcgb3IgQmlnSW50ZWdlci4gRGVmYXVsdHMgdG8gMTAyNCBiaXQgdmFsdWUgZnJvbSBSRkMgNTA1NFxuICogLSBnOiBTdHJpbmcgb3IgQmlnSW50ZWdlci4gRGVmYXVsdHMgdG8gMi5cbiAqIC0gazogU3RyaW5nIG9yIEJpZ0ludGVnZXIuIERlZmF1bHRzIHRvIGhhc2goTiwgZylcbiAqL1xuY29uc3QgcGFyYW1zRnJvbU9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIC8vIGZhc3QgcGF0aFxuICAgIHJldHVybiBfZGVmYXVsdHM7XG5cbiAgdmFyIHJldCA9IHsgLi4uX2RlZmF1bHRzIH07XG5cbiAgWydOJywgJ2cnLCAnayddLmZvckVhY2gocCA9PiB7XG4gICAgaWYgKG9wdGlvbnNbcF0pIHtcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uc1twXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgcmV0W3BdID0gbmV3IEJpZ0ludGVnZXIob3B0aW9uc1twXSwgMTYpO1xuICAgICAgZWxzZSBpZiAob3B0aW9uc1twXSBpbnN0YW5jZW9mIEJpZ0ludGVnZXIpXG4gICAgICAgIHJldFtwXSA9IG9wdGlvbnNbcF07XG4gICAgICBlbHNlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcGFyYW1ldGVyOiBcIiArIHApO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKG9wdGlvbnMuaGFzaClcbiAgICByZXQuaGFzaCA9IHggPT4gb3B0aW9ucy5oYXNoKHgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgaWYgKCFvcHRpb25zLmsgJiYgKG9wdGlvbnMuTiB8fCBvcHRpb25zLmcgfHwgb3B0aW9ucy5oYXNoKSkge1xuICAgIHJldC5rID0gcmV0Lmhhc2gocmV0Lk4udG9TdHJpbmcoMTYpICsgcmV0LmcudG9TdHJpbmcoMTYpKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59O1xuIiwiLy8vIE1FVEVPUiBXUkFQUEVSXG5leHBvcnQgZGVmYXVsdCBCaWdJbnRlZ2VyID0gKGZ1bmN0aW9uICgpIHtcblxuXG4vLy8gQkVHSU4ganNibi5qc1xuXG4vKlxuICogQ29weXJpZ2h0IChjKSAyMDAzLTIwMDUgIFRvbSBXdVxuICogQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmdcbiAqIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuICogXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4gKiB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4gKiBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbiAqIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xuICogdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gKiBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUy1JU1wiIEFORCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBcbiAqIEVYUFJFU1MsIElNUExJRUQgT1IgT1RIRVJXSVNFLCBJTkNMVURJTkcgV0lUSE9VVCBMSU1JVEFUSU9OLCBBTlkgXG4gKiBXQVJSQU5UWSBPRiBNRVJDSEFOVEFCSUxJVFkgT1IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBcbiAqXG4gKiBJTiBOTyBFVkVOVCBTSEFMTCBUT00gV1UgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgSU5DSURFTlRBTCxcbiAqIElORElSRUNUIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPRiBBTlkgS0lORCwgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUlxuICogUkVTVUxUSU5HIEZST00gTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBPUiBOT1QgQURWSVNFRCBPRlxuICogVEhFIFBPU1NJQklMSVRZIE9GIERBTUFHRSwgQU5EIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBBUklTSU5HIE9VVFxuICogT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1IgUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cbiAqXG4gKiBJbiBhZGRpdGlvbiwgdGhlIGZvbGxvd2luZyBjb25kaXRpb24gYXBwbGllczpcbiAqXG4gKiBBbGwgcmVkaXN0cmlidXRpb25zIG11c3QgcmV0YWluIGFuIGludGFjdCBjb3B5IG9mIHRoaXMgY29weXJpZ2h0IG5vdGljZVxuICogYW5kIGRpc2NsYWltZXIuXG4gKi9cblxuLy8gQmFzaWMgSmF2YVNjcmlwdCBCTiBsaWJyYXJ5IC0gc3Vic2V0IHVzZWZ1bCBmb3IgUlNBIGVuY3J5cHRpb24uXG5cbi8vIEJpdHMgcGVyIGRpZ2l0XG52YXIgZGJpdHM7XG5cbi8vIEphdmFTY3JpcHQgZW5naW5lIGFuYWx5c2lzXG52YXIgY2FuYXJ5ID0gMHhkZWFkYmVlZmNhZmU7XG52YXIgal9sbSA9ICgoY2FuYXJ5JjB4ZmZmZmZmKT09MHhlZmNhZmUpO1xuXG4vLyAocHVibGljKSBDb25zdHJ1Y3RvclxuZnVuY3Rpb24gQmlnSW50ZWdlcihhLGIsYykge1xuICBpZihhICE9IG51bGwpXG4gICAgaWYoXCJudW1iZXJcIiA9PSB0eXBlb2YgYSkgdGhpcy5mcm9tTnVtYmVyKGEsYixjKTtcbiAgICBlbHNlIGlmKGIgPT0gbnVsbCAmJiBcInN0cmluZ1wiICE9IHR5cGVvZiBhKSB0aGlzLmZyb21TdHJpbmcoYSwyNTYpO1xuICAgIGVsc2UgdGhpcy5mcm9tU3RyaW5nKGEsYik7XG59XG5cbi8vIHJldHVybiBuZXcsIHVuc2V0IEJpZ0ludGVnZXJcbmZ1bmN0aW9uIG5iaSgpIHsgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG51bGwpOyB9XG5cbi8vIGFtOiBDb21wdXRlIHdfaiArPSAoeCp0aGlzX2kpLCBwcm9wYWdhdGUgY2Fycmllcyxcbi8vIGMgaXMgaW5pdGlhbCBjYXJyeSwgcmV0dXJucyBmaW5hbCBjYXJyeS5cbi8vIGMgPCAzKmR2YWx1ZSwgeCA8IDIqZHZhbHVlLCB0aGlzX2kgPCBkdmFsdWVcbi8vIFdlIG5lZWQgdG8gc2VsZWN0IHRoZSBmYXN0ZXN0IG9uZSB0aGF0IHdvcmtzIGluIHRoaXMgZW52aXJvbm1lbnQuXG5cbi8vIGFtMTogdXNlIGEgc2luZ2xlIG11bHQgYW5kIGRpdmlkZSB0byBnZXQgdGhlIGhpZ2ggYml0cyxcbi8vIG1heCBkaWdpdCBiaXRzIHNob3VsZCBiZSAyNiBiZWNhdXNlXG4vLyBtYXggaW50ZXJuYWwgdmFsdWUgPSAyKmR2YWx1ZV4yLTIqZHZhbHVlICg8IDJeNTMpXG5mdW5jdGlvbiBhbTEoaSx4LHcsaixjLG4pIHtcbiAgd2hpbGUoLS1uID49IDApIHtcbiAgICB2YXIgdiA9IHgqdGhpc1tpKytdK3dbal0rYztcbiAgICBjID0gTWF0aC5mbG9vcih2LzB4NDAwMDAwMCk7XG4gICAgd1tqKytdID0gdiYweDNmZmZmZmY7XG4gIH1cbiAgcmV0dXJuIGM7XG59XG4vLyBhbTIgYXZvaWRzIGEgYmlnIG11bHQtYW5kLWV4dHJhY3QgY29tcGxldGVseS5cbi8vIE1heCBkaWdpdCBiaXRzIHNob3VsZCBiZSA8PSAzMCBiZWNhdXNlIHdlIGRvIGJpdHdpc2Ugb3BzXG4vLyBvbiB2YWx1ZXMgdXAgdG8gMipoZHZhbHVlXjItaGR2YWx1ZS0xICg8IDJeMzEpXG5mdW5jdGlvbiBhbTIoaSx4LHcsaixjLG4pIHtcbiAgdmFyIHhsID0geCYweDdmZmYsIHhoID0geD4+MTU7XG4gIHdoaWxlKC0tbiA+PSAwKSB7XG4gICAgdmFyIGwgPSB0aGlzW2ldJjB4N2ZmZjtcbiAgICB2YXIgaCA9IHRoaXNbaSsrXT4+MTU7XG4gICAgdmFyIG0gPSB4aCpsK2gqeGw7XG4gICAgbCA9IHhsKmwrKChtJjB4N2ZmZik8PDE1KSt3W2pdKyhjJjB4M2ZmZmZmZmYpO1xuICAgIGMgPSAobD4+PjMwKSsobT4+PjE1KSt4aCpoKyhjPj4+MzApO1xuICAgIHdbaisrXSA9IGwmMHgzZmZmZmZmZjtcbiAgfVxuICByZXR1cm4gYztcbn1cbi8vIEFsdGVybmF0ZWx5LCBzZXQgbWF4IGRpZ2l0IGJpdHMgdG8gMjggc2luY2Ugc29tZVxuLy8gYnJvd3NlcnMgc2xvdyBkb3duIHdoZW4gZGVhbGluZyB3aXRoIDMyLWJpdCBudW1iZXJzLlxuZnVuY3Rpb24gYW0zKGkseCx3LGosYyxuKSB7XG4gIHZhciB4bCA9IHgmMHgzZmZmLCB4aCA9IHg+PjE0O1xuICB3aGlsZSgtLW4gPj0gMCkge1xuICAgIHZhciBsID0gdGhpc1tpXSYweDNmZmY7XG4gICAgdmFyIGggPSB0aGlzW2krK10+PjE0O1xuICAgIHZhciBtID0geGgqbCtoKnhsO1xuICAgIGwgPSB4bCpsKygobSYweDNmZmYpPDwxNCkrd1tqXStjO1xuICAgIGMgPSAobD4+MjgpKyhtPj4xNCkreGgqaDtcbiAgICB3W2orK10gPSBsJjB4ZmZmZmZmZjtcbiAgfVxuICByZXR1cm4gYztcbn1cblxuLyogWFhYIE1FVEVPUiBYWFhcbmlmKGpfbG0gJiYgKG5hdmlnYXRvci5hcHBOYW1lID09IFwiTWljcm9zb2Z0IEludGVybmV0IEV4cGxvcmVyXCIpKSB7XG4gIEJpZ0ludGVnZXIucHJvdG90eXBlLmFtID0gYW0yO1xuICBkYml0cyA9IDMwO1xufVxuZWxzZSBpZihqX2xtICYmIChuYXZpZ2F0b3IuYXBwTmFtZSAhPSBcIk5ldHNjYXBlXCIpKSB7XG4gIEJpZ0ludGVnZXIucHJvdG90eXBlLmFtID0gYW0xO1xuICBkYml0cyA9IDI2O1xufVxuZWxzZSBcbiovXG5cbnsgLy8gTW96aWxsYS9OZXRzY2FwZSBzZWVtcyB0byBwcmVmZXIgYW0zXG4gIEJpZ0ludGVnZXIucHJvdG90eXBlLmFtID0gYW0zO1xuICBkYml0cyA9IDI4O1xufVxuXG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5EQiA9IGRiaXRzO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuRE0gPSAoKDE8PGRiaXRzKS0xKTtcbkJpZ0ludGVnZXIucHJvdG90eXBlLkRWID0gKDE8PGRiaXRzKTtcblxudmFyIEJJX0ZQID0gNTI7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5GViA9IE1hdGgucG93KDIsQklfRlApO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuRjEgPSBCSV9GUC1kYml0cztcbkJpZ0ludGVnZXIucHJvdG90eXBlLkYyID0gMipkYml0cy1CSV9GUDtcblxuLy8gRGlnaXQgY29udmVyc2lvbnNcbnZhciBCSV9STSA9IFwiMDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6XCI7XG52YXIgQklfUkMgPSBuZXcgQXJyYXkoKTtcbnZhciBycix2djtcbnJyID0gXCIwXCIuY2hhckNvZGVBdCgwKTtcbmZvcih2diA9IDA7IHZ2IDw9IDk7ICsrdnYpIEJJX1JDW3JyKytdID0gdnY7XG5yciA9IFwiYVwiLmNoYXJDb2RlQXQoMCk7XG5mb3IodnYgPSAxMDsgdnYgPCAzNjsgKyt2dikgQklfUkNbcnIrK10gPSB2djtcbnJyID0gXCJBXCIuY2hhckNvZGVBdCgwKTtcbmZvcih2diA9IDEwOyB2diA8IDM2OyArK3Z2KSBCSV9SQ1tycisrXSA9IHZ2O1xuXG5mdW5jdGlvbiBpbnQyY2hhcihuKSB7IHJldHVybiBCSV9STS5jaGFyQXQobik7IH1cbmZ1bmN0aW9uIGludEF0KHMsaSkge1xuICB2YXIgYyA9IEJJX1JDW3MuY2hhckNvZGVBdChpKV07XG4gIHJldHVybiAoYz09bnVsbCk/LTE6Yztcbn1cblxuLy8gKHByb3RlY3RlZCkgY29weSB0aGlzIHRvIHJcbmZ1bmN0aW9uIGJucENvcHlUbyhyKSB7XG4gIGZvcih2YXIgaSA9IHRoaXMudC0xOyBpID49IDA7IC0taSkgcltpXSA9IHRoaXNbaV07XG4gIHIudCA9IHRoaXMudDtcbiAgci5zID0gdGhpcy5zO1xufVxuXG4vLyAocHJvdGVjdGVkKSBzZXQgZnJvbSBpbnRlZ2VyIHZhbHVlIHgsIC1EViA8PSB4IDwgRFZcbmZ1bmN0aW9uIGJucEZyb21JbnQoeCkge1xuICB0aGlzLnQgPSAxO1xuICB0aGlzLnMgPSAoeDwwKT8tMTowO1xuICBpZih4ID4gMCkgdGhpc1swXSA9IHg7XG4gIGVsc2UgaWYoeCA8IC0xKSB0aGlzWzBdID0geCtEVjtcbiAgZWxzZSB0aGlzLnQgPSAwO1xufVxuXG4vLyByZXR1cm4gYmlnaW50IGluaXRpYWxpemVkIHRvIHZhbHVlXG5mdW5jdGlvbiBuYnYoaSkgeyB2YXIgciA9IG5iaSgpOyByLmZyb21JbnQoaSk7IHJldHVybiByOyB9XG5cbi8vIChwcm90ZWN0ZWQpIHNldCBmcm9tIHN0cmluZyBhbmQgcmFkaXhcbmZ1bmN0aW9uIGJucEZyb21TdHJpbmcocyxiKSB7XG4gIHZhciBrO1xuICBpZihiID09IDE2KSBrID0gNDtcbiAgZWxzZSBpZihiID09IDgpIGsgPSAzO1xuICBlbHNlIGlmKGIgPT0gMjU2KSBrID0gODsgLy8gYnl0ZSBhcnJheVxuICBlbHNlIGlmKGIgPT0gMikgayA9IDE7XG4gIGVsc2UgaWYoYiA9PSAzMikgayA9IDU7XG4gIGVsc2UgaWYoYiA9PSA0KSBrID0gMjtcbiAgZWxzZSB7IHRoaXMuZnJvbVJhZGl4KHMsYik7IHJldHVybjsgfVxuICB0aGlzLnQgPSAwO1xuICB0aGlzLnMgPSAwO1xuICB2YXIgaSA9IHMubGVuZ3RoLCBtaSA9IGZhbHNlLCBzaCA9IDA7XG4gIHdoaWxlKC0taSA+PSAwKSB7XG4gICAgdmFyIHggPSAoaz09OCk/c1tpXSYweGZmOmludEF0KHMsaSk7XG4gICAgaWYoeCA8IDApIHtcbiAgICAgIGlmKHMuY2hhckF0KGkpID09IFwiLVwiKSBtaSA9IHRydWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgbWkgPSBmYWxzZTtcbiAgICBpZihzaCA9PSAwKVxuICAgICAgdGhpc1t0aGlzLnQrK10gPSB4O1xuICAgIGVsc2UgaWYoc2grayA+IHRoaXMuREIpIHtcbiAgICAgIHRoaXNbdGhpcy50LTFdIHw9ICh4JigoMTw8KHRoaXMuREItc2gpKS0xKSk8PHNoO1xuICAgICAgdGhpc1t0aGlzLnQrK10gPSAoeD4+KHRoaXMuREItc2gpKTtcbiAgICB9XG4gICAgZWxzZVxuICAgICAgdGhpc1t0aGlzLnQtMV0gfD0geDw8c2g7XG4gICAgc2ggKz0gaztcbiAgICBpZihzaCA+PSB0aGlzLkRCKSBzaCAtPSB0aGlzLkRCO1xuICB9XG4gIGlmKGsgPT0gOCAmJiAoc1swXSYweDgwKSAhPSAwKSB7XG4gICAgdGhpcy5zID0gLTE7XG4gICAgaWYoc2ggPiAwKSB0aGlzW3RoaXMudC0xXSB8PSAoKDE8PCh0aGlzLkRCLXNoKSktMSk8PHNoO1xuICB9XG4gIHRoaXMuY2xhbXAoKTtcbiAgaWYobWkpIEJpZ0ludGVnZXIuWkVSTy5zdWJUbyh0aGlzLHRoaXMpO1xufVxuXG4vLyAocHJvdGVjdGVkKSBjbGFtcCBvZmYgZXhjZXNzIGhpZ2ggd29yZHNcbmZ1bmN0aW9uIGJucENsYW1wKCkge1xuICB2YXIgYyA9IHRoaXMucyZ0aGlzLkRNO1xuICB3aGlsZSh0aGlzLnQgPiAwICYmIHRoaXNbdGhpcy50LTFdID09IGMpIC0tdGhpcy50O1xufVxuXG4vLyAocHVibGljKSByZXR1cm4gc3RyaW5nIHJlcHJlc2VudGF0aW9uIGluIGdpdmVuIHJhZGl4XG5mdW5jdGlvbiBiblRvU3RyaW5nKGIpIHtcbiAgaWYodGhpcy5zIDwgMCkgcmV0dXJuIFwiLVwiK3RoaXMubmVnYXRlKCkudG9TdHJpbmcoYik7XG4gIHZhciBrO1xuICBpZihiID09IDE2KSBrID0gNDtcbiAgZWxzZSBpZihiID09IDgpIGsgPSAzO1xuICBlbHNlIGlmKGIgPT0gMikgayA9IDE7XG4gIGVsc2UgaWYoYiA9PSAzMikgayA9IDU7XG4gIGVsc2UgaWYoYiA9PSA0KSBrID0gMjtcbiAgZWxzZSByZXR1cm4gdGhpcy50b1JhZGl4KGIpO1xuICB2YXIga20gPSAoMTw8ayktMSwgZCwgbSA9IGZhbHNlLCByID0gXCJcIiwgaSA9IHRoaXMudDtcbiAgdmFyIHAgPSB0aGlzLkRCLShpKnRoaXMuREIpJWs7XG4gIGlmKGktLSA+IDApIHtcbiAgICBpZihwIDwgdGhpcy5EQiAmJiAoZCA9IHRoaXNbaV0+PnApID4gMCkgeyBtID0gdHJ1ZTsgciA9IGludDJjaGFyKGQpOyB9XG4gICAgd2hpbGUoaSA+PSAwKSB7XG4gICAgICBpZihwIDwgaykge1xuICAgICAgICBkID0gKHRoaXNbaV0mKCgxPDxwKS0xKSk8PChrLXApO1xuICAgICAgICBkIHw9IHRoaXNbLS1pXT4+KHArPXRoaXMuREItayk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZCA9ICh0aGlzW2ldPj4ocC09aykpJmttO1xuICAgICAgICBpZihwIDw9IDApIHsgcCArPSB0aGlzLkRCOyAtLWk7IH1cbiAgICAgIH1cbiAgICAgIGlmKGQgPiAwKSBtID0gdHJ1ZTtcbiAgICAgIGlmKG0pIHIgKz0gaW50MmNoYXIoZCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBtP3I6XCIwXCI7XG59XG5cbi8vIChwdWJsaWMpIC10aGlzXG5mdW5jdGlvbiBibk5lZ2F0ZSgpIHsgdmFyIHIgPSBuYmkoKTsgQmlnSW50ZWdlci5aRVJPLnN1YlRvKHRoaXMscik7IHJldHVybiByOyB9XG5cbi8vIChwdWJsaWMpIHx0aGlzfFxuZnVuY3Rpb24gYm5BYnMoKSB7IHJldHVybiAodGhpcy5zPDApP3RoaXMubmVnYXRlKCk6dGhpczsgfVxuXG4vLyAocHVibGljKSByZXR1cm4gKyBpZiB0aGlzID4gYSwgLSBpZiB0aGlzIDwgYSwgMCBpZiBlcXVhbFxuZnVuY3Rpb24gYm5Db21wYXJlVG8oYSkge1xuICB2YXIgciA9IHRoaXMucy1hLnM7XG4gIGlmKHIgIT0gMCkgcmV0dXJuIHI7XG4gIHZhciBpID0gdGhpcy50O1xuICByID0gaS1hLnQ7XG4gIGlmKHIgIT0gMCkgcmV0dXJuIHI7XG4gIHdoaWxlKC0taSA+PSAwKSBpZigocj10aGlzW2ldLWFbaV0pICE9IDApIHJldHVybiByO1xuICByZXR1cm4gMDtcbn1cblxuLy8gcmV0dXJucyBiaXQgbGVuZ3RoIG9mIHRoZSBpbnRlZ2VyIHhcbmZ1bmN0aW9uIG5iaXRzKHgpIHtcbiAgdmFyIHIgPSAxLCB0O1xuICBpZigodD14Pj4+MTYpICE9IDApIHsgeCA9IHQ7IHIgKz0gMTY7IH1cbiAgaWYoKHQ9eD4+OCkgIT0gMCkgeyB4ID0gdDsgciArPSA4OyB9XG4gIGlmKCh0PXg+PjQpICE9IDApIHsgeCA9IHQ7IHIgKz0gNDsgfVxuICBpZigodD14Pj4yKSAhPSAwKSB7IHggPSB0OyByICs9IDI7IH1cbiAgaWYoKHQ9eD4+MSkgIT0gMCkgeyB4ID0gdDsgciArPSAxOyB9XG4gIHJldHVybiByO1xufVxuXG4vLyAocHVibGljKSByZXR1cm4gdGhlIG51bWJlciBvZiBiaXRzIGluIFwidGhpc1wiXG5mdW5jdGlvbiBibkJpdExlbmd0aCgpIHtcbiAgaWYodGhpcy50IDw9IDApIHJldHVybiAwO1xuICByZXR1cm4gdGhpcy5EQioodGhpcy50LTEpK25iaXRzKHRoaXNbdGhpcy50LTFdXih0aGlzLnMmdGhpcy5ETSkpO1xufVxuXG4vLyAocHJvdGVjdGVkKSByID0gdGhpcyA8PCBuKkRCXG5mdW5jdGlvbiBibnBETFNoaWZ0VG8obixyKSB7XG4gIHZhciBpO1xuICBmb3IoaSA9IHRoaXMudC0xOyBpID49IDA7IC0taSkgcltpK25dID0gdGhpc1tpXTtcbiAgZm9yKGkgPSBuLTE7IGkgPj0gMDsgLS1pKSByW2ldID0gMDtcbiAgci50ID0gdGhpcy50K247XG4gIHIucyA9IHRoaXMucztcbn1cblxuLy8gKHByb3RlY3RlZCkgciA9IHRoaXMgPj4gbipEQlxuZnVuY3Rpb24gYm5wRFJTaGlmdFRvKG4scikge1xuICBmb3IodmFyIGkgPSBuOyBpIDwgdGhpcy50OyArK2kpIHJbaS1uXSA9IHRoaXNbaV07XG4gIHIudCA9IE1hdGgubWF4KHRoaXMudC1uLDApO1xuICByLnMgPSB0aGlzLnM7XG59XG5cbi8vIChwcm90ZWN0ZWQpIHIgPSB0aGlzIDw8IG5cbmZ1bmN0aW9uIGJucExTaGlmdFRvKG4scikge1xuICB2YXIgYnMgPSBuJXRoaXMuREI7XG4gIHZhciBjYnMgPSB0aGlzLkRCLWJzO1xuICB2YXIgYm0gPSAoMTw8Y2JzKS0xO1xuICB2YXIgZHMgPSBNYXRoLmZsb29yKG4vdGhpcy5EQiksIGMgPSAodGhpcy5zPDxicykmdGhpcy5ETSwgaTtcbiAgZm9yKGkgPSB0aGlzLnQtMTsgaSA+PSAwOyAtLWkpIHtcbiAgICByW2krZHMrMV0gPSAodGhpc1tpXT4+Y2JzKXxjO1xuICAgIGMgPSAodGhpc1tpXSZibSk8PGJzO1xuICB9XG4gIGZvcihpID0gZHMtMTsgaSA+PSAwOyAtLWkpIHJbaV0gPSAwO1xuICByW2RzXSA9IGM7XG4gIHIudCA9IHRoaXMudCtkcysxO1xuICByLnMgPSB0aGlzLnM7XG4gIHIuY2xhbXAoKTtcbn1cblxuLy8gKHByb3RlY3RlZCkgciA9IHRoaXMgPj4gblxuZnVuY3Rpb24gYm5wUlNoaWZ0VG8obixyKSB7XG4gIHIucyA9IHRoaXMucztcbiAgdmFyIGRzID0gTWF0aC5mbG9vcihuL3RoaXMuREIpO1xuICBpZihkcyA+PSB0aGlzLnQpIHsgci50ID0gMDsgcmV0dXJuOyB9XG4gIHZhciBicyA9IG4ldGhpcy5EQjtcbiAgdmFyIGNicyA9IHRoaXMuREItYnM7XG4gIHZhciBibSA9ICgxPDxicyktMTtcbiAgclswXSA9IHRoaXNbZHNdPj5icztcbiAgZm9yKHZhciBpID0gZHMrMTsgaSA8IHRoaXMudDsgKytpKSB7XG4gICAgcltpLWRzLTFdIHw9ICh0aGlzW2ldJmJtKTw8Y2JzO1xuICAgIHJbaS1kc10gPSB0aGlzW2ldPj5icztcbiAgfVxuICBpZihicyA+IDApIHJbdGhpcy50LWRzLTFdIHw9ICh0aGlzLnMmYm0pPDxjYnM7XG4gIHIudCA9IHRoaXMudC1kcztcbiAgci5jbGFtcCgpO1xufVxuXG4vLyAocHJvdGVjdGVkKSByID0gdGhpcyAtIGFcbmZ1bmN0aW9uIGJucFN1YlRvKGEscikge1xuICB2YXIgaSA9IDAsIGMgPSAwLCBtID0gTWF0aC5taW4oYS50LHRoaXMudCk7XG4gIHdoaWxlKGkgPCBtKSB7XG4gICAgYyArPSB0aGlzW2ldLWFbaV07XG4gICAgcltpKytdID0gYyZ0aGlzLkRNO1xuICAgIGMgPj49IHRoaXMuREI7XG4gIH1cbiAgaWYoYS50IDwgdGhpcy50KSB7XG4gICAgYyAtPSBhLnM7XG4gICAgd2hpbGUoaSA8IHRoaXMudCkge1xuICAgICAgYyArPSB0aGlzW2ldO1xuICAgICAgcltpKytdID0gYyZ0aGlzLkRNO1xuICAgICAgYyA+Pj0gdGhpcy5EQjtcbiAgICB9XG4gICAgYyArPSB0aGlzLnM7XG4gIH1cbiAgZWxzZSB7XG4gICAgYyArPSB0aGlzLnM7XG4gICAgd2hpbGUoaSA8IGEudCkge1xuICAgICAgYyAtPSBhW2ldO1xuICAgICAgcltpKytdID0gYyZ0aGlzLkRNO1xuICAgICAgYyA+Pj0gdGhpcy5EQjtcbiAgICB9XG4gICAgYyAtPSBhLnM7XG4gIH1cbiAgci5zID0gKGM8MCk/LTE6MDtcbiAgaWYoYyA8IC0xKSByW2krK10gPSB0aGlzLkRWK2M7XG4gIGVsc2UgaWYoYyA+IDApIHJbaSsrXSA9IGM7XG4gIHIudCA9IGk7XG4gIHIuY2xhbXAoKTtcbn1cblxuLy8gKHByb3RlY3RlZCkgciA9IHRoaXMgKiBhLCByICE9IHRoaXMsYSAoSEFDIDE0LjEyKVxuLy8gXCJ0aGlzXCIgc2hvdWxkIGJlIHRoZSBsYXJnZXIgb25lIGlmIGFwcHJvcHJpYXRlLlxuZnVuY3Rpb24gYm5wTXVsdGlwbHlUbyhhLHIpIHtcbiAgdmFyIHggPSB0aGlzLmFicygpLCB5ID0gYS5hYnMoKTtcbiAgdmFyIGkgPSB4LnQ7XG4gIHIudCA9IGkreS50O1xuICB3aGlsZSgtLWkgPj0gMCkgcltpXSA9IDA7XG4gIGZvcihpID0gMDsgaSA8IHkudDsgKytpKSByW2kreC50XSA9IHguYW0oMCx5W2ldLHIsaSwwLHgudCk7XG4gIHIucyA9IDA7XG4gIHIuY2xhbXAoKTtcbiAgaWYodGhpcy5zICE9IGEucykgQmlnSW50ZWdlci5aRVJPLnN1YlRvKHIscik7XG59XG5cbi8vIChwcm90ZWN0ZWQpIHIgPSB0aGlzXjIsIHIgIT0gdGhpcyAoSEFDIDE0LjE2KVxuZnVuY3Rpb24gYm5wU3F1YXJlVG8ocikge1xuICB2YXIgeCA9IHRoaXMuYWJzKCk7XG4gIHZhciBpID0gci50ID0gMip4LnQ7XG4gIHdoaWxlKC0taSA+PSAwKSByW2ldID0gMDtcbiAgZm9yKGkgPSAwOyBpIDwgeC50LTE7ICsraSkge1xuICAgIHZhciBjID0geC5hbShpLHhbaV0sciwyKmksMCwxKTtcbiAgICBpZigocltpK3gudF0rPXguYW0oaSsxLDIqeFtpXSxyLDIqaSsxLGMseC50LWktMSkpID49IHguRFYpIHtcbiAgICAgIHJbaSt4LnRdIC09IHguRFY7XG4gICAgICByW2kreC50KzFdID0gMTtcbiAgICB9XG4gIH1cbiAgaWYoci50ID4gMCkgcltyLnQtMV0gKz0geC5hbShpLHhbaV0sciwyKmksMCwxKTtcbiAgci5zID0gMDtcbiAgci5jbGFtcCgpO1xufVxuXG4vLyAocHJvdGVjdGVkKSBkaXZpZGUgdGhpcyBieSBtLCBxdW90aWVudCBhbmQgcmVtYWluZGVyIHRvIHEsIHIgKEhBQyAxNC4yMClcbi8vIHIgIT0gcSwgdGhpcyAhPSBtLiAgcSBvciByIG1heSBiZSBudWxsLlxuZnVuY3Rpb24gYm5wRGl2UmVtVG8obSxxLHIpIHtcbiAgdmFyIHBtID0gbS5hYnMoKTtcbiAgaWYocG0udCA8PSAwKSByZXR1cm47XG4gIHZhciBwdCA9IHRoaXMuYWJzKCk7XG4gIGlmKHB0LnQgPCBwbS50KSB7XG4gICAgaWYocSAhPSBudWxsKSBxLmZyb21JbnQoMCk7XG4gICAgaWYociAhPSBudWxsKSB0aGlzLmNvcHlUbyhyKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYociA9PSBudWxsKSByID0gbmJpKCk7XG4gIHZhciB5ID0gbmJpKCksIHRzID0gdGhpcy5zLCBtcyA9IG0ucztcbiAgdmFyIG5zaCA9IHRoaXMuREItbmJpdHMocG1bcG0udC0xXSk7XHQvLyBub3JtYWxpemUgbW9kdWx1c1xuICBpZihuc2ggPiAwKSB7IHBtLmxTaGlmdFRvKG5zaCx5KTsgcHQubFNoaWZ0VG8obnNoLHIpOyB9XG4gIGVsc2UgeyBwbS5jb3B5VG8oeSk7IHB0LmNvcHlUbyhyKTsgfVxuICB2YXIgeXMgPSB5LnQ7XG4gIHZhciB5MCA9IHlbeXMtMV07XG4gIGlmKHkwID09IDApIHJldHVybjtcbiAgdmFyIHl0ID0geTAqKDE8PHRoaXMuRjEpKygoeXM+MSk/eVt5cy0yXT4+dGhpcy5GMjowKTtcbiAgdmFyIGQxID0gdGhpcy5GVi95dCwgZDIgPSAoMTw8dGhpcy5GMSkveXQsIGUgPSAxPDx0aGlzLkYyO1xuICB2YXIgaSA9IHIudCwgaiA9IGkteXMsIHQgPSAocT09bnVsbCk/bmJpKCk6cTtcbiAgeS5kbFNoaWZ0VG8oaix0KTtcbiAgaWYoci5jb21wYXJlVG8odCkgPj0gMCkge1xuICAgIHJbci50KytdID0gMTtcbiAgICByLnN1YlRvKHQscik7XG4gIH1cbiAgQmlnSW50ZWdlci5PTkUuZGxTaGlmdFRvKHlzLHQpO1xuICB0LnN1YlRvKHkseSk7XHQvLyBcIm5lZ2F0aXZlXCIgeSBzbyB3ZSBjYW4gcmVwbGFjZSBzdWIgd2l0aCBhbSBsYXRlclxuICB3aGlsZSh5LnQgPCB5cykgeVt5LnQrK10gPSAwO1xuICB3aGlsZSgtLWogPj0gMCkge1xuICAgIC8vIEVzdGltYXRlIHF1b3RpZW50IGRpZ2l0XG4gICAgdmFyIHFkID0gKHJbLS1pXT09eTApP3RoaXMuRE06TWF0aC5mbG9vcihyW2ldKmQxKyhyW2ktMV0rZSkqZDIpO1xuICAgIGlmKChyW2ldKz15LmFtKDAscWQscixqLDAseXMpKSA8IHFkKSB7XHQvLyBUcnkgaXQgb3V0XG4gICAgICB5LmRsU2hpZnRUbyhqLHQpO1xuICAgICAgci5zdWJUbyh0LHIpO1xuICAgICAgd2hpbGUocltpXSA8IC0tcWQpIHIuc3ViVG8odCxyKTtcbiAgICB9XG4gIH1cbiAgaWYocSAhPSBudWxsKSB7XG4gICAgci5kclNoaWZ0VG8oeXMscSk7XG4gICAgaWYodHMgIT0gbXMpIEJpZ0ludGVnZXIuWkVSTy5zdWJUbyhxLHEpO1xuICB9XG4gIHIudCA9IHlzO1xuICByLmNsYW1wKCk7XG4gIGlmKG5zaCA+IDApIHIuclNoaWZ0VG8obnNoLHIpO1x0Ly8gRGVub3JtYWxpemUgcmVtYWluZGVyXG4gIGlmKHRzIDwgMCkgQmlnSW50ZWdlci5aRVJPLnN1YlRvKHIscik7XG59XG5cbi8vIChwdWJsaWMpIHRoaXMgbW9kIGFcbmZ1bmN0aW9uIGJuTW9kKGEpIHtcbiAgdmFyIHIgPSBuYmkoKTtcbiAgdGhpcy5hYnMoKS5kaXZSZW1UbyhhLG51bGwscik7XG4gIGlmKHRoaXMucyA8IDAgJiYgci5jb21wYXJlVG8oQmlnSW50ZWdlci5aRVJPKSA+IDApIGEuc3ViVG8ocixyKTtcbiAgcmV0dXJuIHI7XG59XG5cbi8vIE1vZHVsYXIgcmVkdWN0aW9uIHVzaW5nIFwiY2xhc3NpY1wiIGFsZ29yaXRobVxuZnVuY3Rpb24gQ2xhc3NpYyhtKSB7IHRoaXMubSA9IG07IH1cbmZ1bmN0aW9uIGNDb252ZXJ0KHgpIHtcbiAgaWYoeC5zIDwgMCB8fCB4LmNvbXBhcmVUbyh0aGlzLm0pID49IDApIHJldHVybiB4Lm1vZCh0aGlzLm0pO1xuICBlbHNlIHJldHVybiB4O1xufVxuZnVuY3Rpb24gY1JldmVydCh4KSB7IHJldHVybiB4OyB9XG5mdW5jdGlvbiBjUmVkdWNlKHgpIHsgeC5kaXZSZW1Ubyh0aGlzLm0sbnVsbCx4KTsgfVxuZnVuY3Rpb24gY011bFRvKHgseSxyKSB7IHgubXVsdGlwbHlUbyh5LHIpOyB0aGlzLnJlZHVjZShyKTsgfVxuZnVuY3Rpb24gY1NxclRvKHgscikgeyB4LnNxdWFyZVRvKHIpOyB0aGlzLnJlZHVjZShyKTsgfVxuXG5DbGFzc2ljLnByb3RvdHlwZS5jb252ZXJ0ID0gY0NvbnZlcnQ7XG5DbGFzc2ljLnByb3RvdHlwZS5yZXZlcnQgPSBjUmV2ZXJ0O1xuQ2xhc3NpYy5wcm90b3R5cGUucmVkdWNlID0gY1JlZHVjZTtcbkNsYXNzaWMucHJvdG90eXBlLm11bFRvID0gY011bFRvO1xuQ2xhc3NpYy5wcm90b3R5cGUuc3FyVG8gPSBjU3FyVG87XG5cbi8vIChwcm90ZWN0ZWQpIHJldHVybiBcIi0xL3RoaXMgJSAyXkRCXCI7IHVzZWZ1bCBmb3IgTW9udC4gcmVkdWN0aW9uXG4vLyBqdXN0aWZpY2F0aW9uOlxuLy8gICAgICAgICB4eSA9PSAxIChtb2QgbSlcbi8vICAgICAgICAgeHkgPSAgMStrbVxuLy8gICB4eSgyLXh5KSA9ICgxK2ttKSgxLWttKVxuLy8geFt5KDIteHkpXSA9IDEta14ybV4yXG4vLyB4W3koMi14eSldID09IDEgKG1vZCBtXjIpXG4vLyBpZiB5IGlzIDEveCBtb2QgbSwgdGhlbiB5KDIteHkpIGlzIDEveCBtb2QgbV4yXG4vLyBzaG91bGQgcmVkdWNlIHggYW5kIHkoMi14eSkgYnkgbV4yIGF0IGVhY2ggc3RlcCB0byBrZWVwIHNpemUgYm91bmRlZC5cbi8vIEpTIG11bHRpcGx5IFwib3ZlcmZsb3dzXCIgZGlmZmVyZW50bHkgZnJvbSBDL0MrKywgc28gY2FyZSBpcyBuZWVkZWQgaGVyZS5cbmZ1bmN0aW9uIGJucEludkRpZ2l0KCkge1xuICBpZih0aGlzLnQgPCAxKSByZXR1cm4gMDtcbiAgdmFyIHggPSB0aGlzWzBdO1xuICBpZigoeCYxKSA9PSAwKSByZXR1cm4gMDtcbiAgdmFyIHkgPSB4JjM7XHRcdC8vIHkgPT0gMS94IG1vZCAyXjJcbiAgeSA9ICh5KigyLSh4JjB4ZikqeSkpJjB4ZjtcdC8vIHkgPT0gMS94IG1vZCAyXjRcbiAgeSA9ICh5KigyLSh4JjB4ZmYpKnkpKSYweGZmO1x0Ly8geSA9PSAxL3ggbW9kIDJeOFxuICB5ID0gKHkqKDItKCgoeCYweGZmZmYpKnkpJjB4ZmZmZikpKSYweGZmZmY7XHQvLyB5ID09IDEveCBtb2QgMl4xNlxuICAvLyBsYXN0IHN0ZXAgLSBjYWxjdWxhdGUgaW52ZXJzZSBtb2QgRFYgZGlyZWN0bHk7XG4gIC8vIGFzc3VtZXMgMTYgPCBEQiA8PSAzMiBhbmQgYXNzdW1lcyBhYmlsaXR5IHRvIGhhbmRsZSA0OC1iaXQgaW50c1xuICB5ID0gKHkqKDIteCp5JXRoaXMuRFYpKSV0aGlzLkRWO1x0XHQvLyB5ID09IDEveCBtb2QgMl5kYml0c1xuICAvLyB3ZSByZWFsbHkgd2FudCB0aGUgbmVnYXRpdmUgaW52ZXJzZSwgYW5kIC1EViA8IHkgPCBEVlxuICByZXR1cm4gKHk+MCk/dGhpcy5EVi15Oi15O1xufVxuXG4vLyBNb250Z29tZXJ5IHJlZHVjdGlvblxuZnVuY3Rpb24gTW9udGdvbWVyeShtKSB7XG4gIHRoaXMubSA9IG07XG4gIHRoaXMubXAgPSBtLmludkRpZ2l0KCk7XG4gIHRoaXMubXBsID0gdGhpcy5tcCYweDdmZmY7XG4gIHRoaXMubXBoID0gdGhpcy5tcD4+MTU7XG4gIHRoaXMudW0gPSAoMTw8KG0uREItMTUpKS0xO1xuICB0aGlzLm10MiA9IDIqbS50O1xufVxuXG4vLyB4UiBtb2QgbVxuZnVuY3Rpb24gbW9udENvbnZlcnQoeCkge1xuICB2YXIgciA9IG5iaSgpO1xuICB4LmFicygpLmRsU2hpZnRUbyh0aGlzLm0udCxyKTtcbiAgci5kaXZSZW1Ubyh0aGlzLm0sbnVsbCxyKTtcbiAgaWYoeC5zIDwgMCAmJiByLmNvbXBhcmVUbyhCaWdJbnRlZ2VyLlpFUk8pID4gMCkgdGhpcy5tLnN1YlRvKHIscik7XG4gIHJldHVybiByO1xufVxuXG4vLyB4L1IgbW9kIG1cbmZ1bmN0aW9uIG1vbnRSZXZlcnQoeCkge1xuICB2YXIgciA9IG5iaSgpO1xuICB4LmNvcHlUbyhyKTtcbiAgdGhpcy5yZWR1Y2Uocik7XG4gIHJldHVybiByO1xufVxuXG4vLyB4ID0geC9SIG1vZCBtIChIQUMgMTQuMzIpXG5mdW5jdGlvbiBtb250UmVkdWNlKHgpIHtcbiAgd2hpbGUoeC50IDw9IHRoaXMubXQyKVx0Ly8gcGFkIHggc28gYW0gaGFzIGVub3VnaCByb29tIGxhdGVyXG4gICAgeFt4LnQrK10gPSAwO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5tLnQ7ICsraSkge1xuICAgIC8vIGZhc3RlciB3YXkgb2YgY2FsY3VsYXRpbmcgdTAgPSB4W2ldKm1wIG1vZCBEVlxuICAgIHZhciBqID0geFtpXSYweDdmZmY7XG4gICAgdmFyIHUwID0gKGoqdGhpcy5tcGwrKCgoaip0aGlzLm1waCsoeFtpXT4+MTUpKnRoaXMubXBsKSZ0aGlzLnVtKTw8MTUpKSZ4LkRNO1xuICAgIC8vIHVzZSBhbSB0byBjb21iaW5lIHRoZSBtdWx0aXBseS1zaGlmdC1hZGQgaW50byBvbmUgY2FsbFxuICAgIGogPSBpK3RoaXMubS50O1xuICAgIHhbal0gKz0gdGhpcy5tLmFtKDAsdTAseCxpLDAsdGhpcy5tLnQpO1xuICAgIC8vIHByb3BhZ2F0ZSBjYXJyeVxuICAgIHdoaWxlKHhbal0gPj0geC5EVikgeyB4W2pdIC09IHguRFY7IHhbKytqXSsrOyB9XG4gIH1cbiAgeC5jbGFtcCgpO1xuICB4LmRyU2hpZnRUbyh0aGlzLm0udCx4KTtcbiAgaWYoeC5jb21wYXJlVG8odGhpcy5tKSA+PSAwKSB4LnN1YlRvKHRoaXMubSx4KTtcbn1cblxuLy8gciA9IFwieF4yL1IgbW9kIG1cIjsgeCAhPSByXG5mdW5jdGlvbiBtb250U3FyVG8oeCxyKSB7IHguc3F1YXJlVG8ocik7IHRoaXMucmVkdWNlKHIpOyB9XG5cbi8vIHIgPSBcInh5L1IgbW9kIG1cIjsgeCx5ICE9IHJcbmZ1bmN0aW9uIG1vbnRNdWxUbyh4LHkscikgeyB4Lm11bHRpcGx5VG8oeSxyKTsgdGhpcy5yZWR1Y2Uocik7IH1cblxuTW9udGdvbWVyeS5wcm90b3R5cGUuY29udmVydCA9IG1vbnRDb252ZXJ0O1xuTW9udGdvbWVyeS5wcm90b3R5cGUucmV2ZXJ0ID0gbW9udFJldmVydDtcbk1vbnRnb21lcnkucHJvdG90eXBlLnJlZHVjZSA9IG1vbnRSZWR1Y2U7XG5Nb250Z29tZXJ5LnByb3RvdHlwZS5tdWxUbyA9IG1vbnRNdWxUbztcbk1vbnRnb21lcnkucHJvdG90eXBlLnNxclRvID0gbW9udFNxclRvO1xuXG4vLyAocHJvdGVjdGVkKSB0cnVlIGlmZiB0aGlzIGlzIGV2ZW5cbmZ1bmN0aW9uIGJucElzRXZlbigpIHsgcmV0dXJuICgodGhpcy50PjApPyh0aGlzWzBdJjEpOnRoaXMucykgPT0gMDsgfVxuXG4vLyAocHJvdGVjdGVkKSB0aGlzXmUsIGUgPCAyXjMyLCBkb2luZyBzcXIgYW5kIG11bCB3aXRoIFwiclwiIChIQUMgMTQuNzkpXG5mdW5jdGlvbiBibnBFeHAoZSx6KSB7XG4gIGlmKGUgPiAweGZmZmZmZmZmIHx8IGUgPCAxKSByZXR1cm4gQmlnSW50ZWdlci5PTkU7XG4gIHZhciByID0gbmJpKCksIHIyID0gbmJpKCksIGcgPSB6LmNvbnZlcnQodGhpcyksIGkgPSBuYml0cyhlKS0xO1xuICBnLmNvcHlUbyhyKTtcbiAgd2hpbGUoLS1pID49IDApIHtcbiAgICB6LnNxclRvKHIscjIpO1xuICAgIGlmKChlJigxPDxpKSkgPiAwKSB6Lm11bFRvKHIyLGcscik7XG4gICAgZWxzZSB7IHZhciB0ID0gcjsgciA9IHIyOyByMiA9IHQ7IH1cbiAgfVxuICByZXR1cm4gei5yZXZlcnQocik7XG59XG5cbi8vIChwdWJsaWMpIHRoaXNeZSAlIG0sIDAgPD0gZSA8IDJeMzJcbmZ1bmN0aW9uIGJuTW9kUG93SW50KGUsbSkge1xuICB2YXIgejtcbiAgaWYoZSA8IDI1NiB8fCBtLmlzRXZlbigpKSB6ID0gbmV3IENsYXNzaWMobSk7IGVsc2UgeiA9IG5ldyBNb250Z29tZXJ5KG0pO1xuICByZXR1cm4gdGhpcy5leHAoZSx6KTtcbn1cblxuLy8gcHJvdGVjdGVkXG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5jb3B5VG8gPSBibnBDb3B5VG87XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tSW50ID0gYm5wRnJvbUludDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmZyb21TdHJpbmcgPSBibnBGcm9tU3RyaW5nO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuY2xhbXAgPSBibnBDbGFtcDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmRsU2hpZnRUbyA9IGJucERMU2hpZnRUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLmRyU2hpZnRUbyA9IGJucERSU2hpZnRUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLmxTaGlmdFRvID0gYm5wTFNoaWZ0VG87XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5yU2hpZnRUbyA9IGJucFJTaGlmdFRvO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuc3ViVG8gPSBibnBTdWJUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5VG8gPSBibnBNdWx0aXBseVRvO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuc3F1YXJlVG8gPSBibnBTcXVhcmVUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLmRpdlJlbVRvID0gYm5wRGl2UmVtVG87XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5pbnZEaWdpdCA9IGJucEludkRpZ2l0O1xuQmlnSW50ZWdlci5wcm90b3R5cGUuaXNFdmVuID0gYm5wSXNFdmVuO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuZXhwID0gYm5wRXhwO1xuXG4vLyBwdWJsaWNcbkJpZ0ludGVnZXIucHJvdG90eXBlLnRvU3RyaW5nID0gYm5Ub1N0cmluZztcbkJpZ0ludGVnZXIucHJvdG90eXBlLm5lZ2F0ZSA9IGJuTmVnYXRlO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuYWJzID0gYm5BYnM7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlVG8gPSBibkNvbXBhcmVUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLmJpdExlbmd0aCA9IGJuQml0TGVuZ3RoO1xuQmlnSW50ZWdlci5wcm90b3R5cGUubW9kID0gYm5Nb2Q7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RQb3dJbnQgPSBibk1vZFBvd0ludDtcblxuLy8gXCJjb25zdGFudHNcIlxuQmlnSW50ZWdlci5aRVJPID0gbmJ2KDApO1xuQmlnSW50ZWdlci5PTkUgPSBuYnYoMSk7XG5cblxuLy8vIEJFR0lOIGpzYm4yLmpzXG5cbi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMDMtMjAwNSAgVG9tIFd1XG4gKiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZ1xuICogYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4gKiBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbiAqIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbiAqIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xuICogcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvXG4gKiB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAqIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTLUlTXCIgQU5EIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIFxuICogRVhQUkVTUywgSU1QTElFRCBPUiBPVEhFUldJU0UsIElOQ0xVRElORyBXSVRIT1VUIExJTUlUQVRJT04sIEFOWSBcbiAqIFdBUlJBTlRZIE9GIE1FUkNIQU5UQUJJTElUWSBPUiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFxuICpcbiAqIElOIE5PIEVWRU5UIFNIQUxMIFRPTSBXVSBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBJTkNJREVOVEFMLFxuICogSU5ESVJFQ1QgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIE9GIEFOWSBLSU5ELCBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSXG4gKiBSRVNVTFRJTkcgRlJPTSBMT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIE9SIE5PVCBBRFZJU0VEIE9GXG4gKiBUSEUgUE9TU0lCSUxJVFkgT0YgREFNQUdFLCBBTkQgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIEFSSVNJTkcgT1VUXG4gKiBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUiBQRVJGT1JNQU5DRSBPRiBUSElTIFNPRlRXQVJFLlxuICpcbiAqIEluIGFkZGl0aW9uLCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbiBhcHBsaWVzOlxuICpcbiAqIEFsbCByZWRpc3RyaWJ1dGlvbnMgbXVzdCByZXRhaW4gYW4gaW50YWN0IGNvcHkgb2YgdGhpcyBjb3B5cmlnaHQgbm90aWNlXG4gKiBhbmQgZGlzY2xhaW1lci5cbiAqL1xuXG4vLyBFeHRlbmRlZCBKYXZhU2NyaXB0IEJOIGZ1bmN0aW9ucywgcmVxdWlyZWQgZm9yIFJTQSBwcml2YXRlIG9wcy5cblxuLy8gKHB1YmxpYylcbmZ1bmN0aW9uIGJuQ2xvbmUoKSB7IHZhciByID0gbmJpKCk7IHRoaXMuY29weVRvKHIpOyByZXR1cm4gcjsgfVxuXG4vLyAocHVibGljKSByZXR1cm4gdmFsdWUgYXMgaW50ZWdlclxuZnVuY3Rpb24gYm5JbnRWYWx1ZSgpIHtcbiAgaWYodGhpcy5zIDwgMCkge1xuICAgIGlmKHRoaXMudCA9PSAxKSByZXR1cm4gdGhpc1swXS10aGlzLkRWO1xuICAgIGVsc2UgaWYodGhpcy50ID09IDApIHJldHVybiAtMTtcbiAgfVxuICBlbHNlIGlmKHRoaXMudCA9PSAxKSByZXR1cm4gdGhpc1swXTtcbiAgZWxzZSBpZih0aGlzLnQgPT0gMCkgcmV0dXJuIDA7XG4gIC8vIGFzc3VtZXMgMTYgPCBEQiA8IDMyXG4gIHJldHVybiAoKHRoaXNbMV0mKCgxPDwoMzItdGhpcy5EQikpLTEpKTw8dGhpcy5EQil8dGhpc1swXTtcbn1cblxuLy8gKHB1YmxpYykgcmV0dXJuIHZhbHVlIGFzIGJ5dGVcbmZ1bmN0aW9uIGJuQnl0ZVZhbHVlKCkgeyByZXR1cm4gKHRoaXMudD09MCk/dGhpcy5zOih0aGlzWzBdPDwyNCk+PjI0OyB9XG5cbi8vIChwdWJsaWMpIHJldHVybiB2YWx1ZSBhcyBzaG9ydCAoYXNzdW1lcyBEQj49MTYpXG5mdW5jdGlvbiBiblNob3J0VmFsdWUoKSB7IHJldHVybiAodGhpcy50PT0wKT90aGlzLnM6KHRoaXNbMF08PDE2KT4+MTY7IH1cblxuLy8gKHByb3RlY3RlZCkgcmV0dXJuIHggcy50LiByXnggPCBEVlxuZnVuY3Rpb24gYm5wQ2h1bmtTaXplKHIpIHsgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5MTjIqdGhpcy5EQi9NYXRoLmxvZyhyKSk7IH1cblxuLy8gKHB1YmxpYykgMCBpZiB0aGlzID09IDAsIDEgaWYgdGhpcyA+IDBcbmZ1bmN0aW9uIGJuU2lnTnVtKCkge1xuICBpZih0aGlzLnMgPCAwKSByZXR1cm4gLTE7XG4gIGVsc2UgaWYodGhpcy50IDw9IDAgfHwgKHRoaXMudCA9PSAxICYmIHRoaXNbMF0gPD0gMCkpIHJldHVybiAwO1xuICBlbHNlIHJldHVybiAxO1xufVxuXG4vLyAocHJvdGVjdGVkKSBjb252ZXJ0IHRvIHJhZGl4IHN0cmluZ1xuZnVuY3Rpb24gYm5wVG9SYWRpeChiKSB7XG4gIGlmKGIgPT0gbnVsbCkgYiA9IDEwO1xuICBpZih0aGlzLnNpZ251bSgpID09IDAgfHwgYiA8IDIgfHwgYiA+IDM2KSByZXR1cm4gXCIwXCI7XG4gIHZhciBjcyA9IHRoaXMuY2h1bmtTaXplKGIpO1xuICB2YXIgYSA9IE1hdGgucG93KGIsY3MpO1xuICB2YXIgZCA9IG5idihhKSwgeSA9IG5iaSgpLCB6ID0gbmJpKCksIHIgPSBcIlwiO1xuICB0aGlzLmRpdlJlbVRvKGQseSx6KTtcbiAgd2hpbGUoeS5zaWdudW0oKSA+IDApIHtcbiAgICByID0gKGErei5pbnRWYWx1ZSgpKS50b1N0cmluZyhiKS5zdWJzdHIoMSkgKyByO1xuICAgIHkuZGl2UmVtVG8oZCx5LHopO1xuICB9XG4gIHJldHVybiB6LmludFZhbHVlKCkudG9TdHJpbmcoYikgKyByO1xufVxuXG4vLyAocHJvdGVjdGVkKSBjb252ZXJ0IGZyb20gcmFkaXggc3RyaW5nXG5mdW5jdGlvbiBibnBGcm9tUmFkaXgocyxiKSB7XG4gIHRoaXMuZnJvbUludCgwKTtcbiAgaWYoYiA9PSBudWxsKSBiID0gMTA7XG4gIHZhciBjcyA9IHRoaXMuY2h1bmtTaXplKGIpO1xuICB2YXIgZCA9IE1hdGgucG93KGIsY3MpLCBtaSA9IGZhbHNlLCBqID0gMCwgdyA9IDA7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHggPSBpbnRBdChzLGkpO1xuICAgIGlmKHggPCAwKSB7XG4gICAgICBpZihzLmNoYXJBdChpKSA9PSBcIi1cIiAmJiB0aGlzLnNpZ251bSgpID09IDApIG1pID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB3ID0gYip3K3g7XG4gICAgaWYoKytqID49IGNzKSB7XG4gICAgICB0aGlzLmRNdWx0aXBseShkKTtcbiAgICAgIHRoaXMuZEFkZE9mZnNldCh3LDApO1xuICAgICAgaiA9IDA7XG4gICAgICB3ID0gMDtcbiAgICB9XG4gIH1cbiAgaWYoaiA+IDApIHtcbiAgICB0aGlzLmRNdWx0aXBseShNYXRoLnBvdyhiLGopKTtcbiAgICB0aGlzLmRBZGRPZmZzZXQodywwKTtcbiAgfVxuICBpZihtaSkgQmlnSW50ZWdlci5aRVJPLnN1YlRvKHRoaXMsdGhpcyk7XG59XG5cbi8vIChwcm90ZWN0ZWQpIGFsdGVybmF0ZSBjb25zdHJ1Y3RvclxuZnVuY3Rpb24gYm5wRnJvbU51bWJlcihhLGIsYykge1xuICBpZihcIm51bWJlclwiID09IHR5cGVvZiBiKSB7XG4gICAgLy8gbmV3IEJpZ0ludGVnZXIoaW50LGludCxSTkcpXG4gICAgaWYoYSA8IDIpIHRoaXMuZnJvbUludCgxKTtcbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuZnJvbU51bWJlcihhLGMpO1xuICAgICAgaWYoIXRoaXMudGVzdEJpdChhLTEpKVx0Ly8gZm9yY2UgTVNCIHNldFxuICAgICAgICB0aGlzLmJpdHdpc2VUbyhCaWdJbnRlZ2VyLk9ORS5zaGlmdExlZnQoYS0xKSxvcF9vcix0aGlzKTtcbiAgICAgIGlmKHRoaXMuaXNFdmVuKCkpIHRoaXMuZEFkZE9mZnNldCgxLDApOyAvLyBmb3JjZSBvZGRcbiAgICAgIHdoaWxlKCF0aGlzLmlzUHJvYmFibGVQcmltZShiKSkge1xuICAgICAgICB0aGlzLmRBZGRPZmZzZXQoMiwwKTtcbiAgICAgICAgaWYodGhpcy5iaXRMZW5ndGgoKSA+IGEpIHRoaXMuc3ViVG8oQmlnSW50ZWdlci5PTkUuc2hpZnRMZWZ0KGEtMSksdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIC8vIG5ldyBCaWdJbnRlZ2VyKGludCxSTkcpXG4gICAgdmFyIHggPSBuZXcgQXJyYXkoKSwgdCA9IGEmNztcbiAgICB4Lmxlbmd0aCA9IChhPj4zKSsxO1xuICAgIGIubmV4dEJ5dGVzKHgpO1xuICAgIGlmKHQgPiAwKSB4WzBdICY9ICgoMTw8dCktMSk7IGVsc2UgeFswXSA9IDA7XG4gICAgdGhpcy5mcm9tU3RyaW5nKHgsMjU2KTtcbiAgfVxufVxuXG4vLyAocHVibGljKSBjb252ZXJ0IHRvIGJpZ2VuZGlhbiBieXRlIGFycmF5XG5mdW5jdGlvbiBiblRvQnl0ZUFycmF5KCkge1xuICB2YXIgaSA9IHRoaXMudCwgciA9IG5ldyBBcnJheSgpO1xuICByWzBdID0gdGhpcy5zO1xuICB2YXIgcCA9IHRoaXMuREItKGkqdGhpcy5EQiklOCwgZCwgayA9IDA7XG4gIGlmKGktLSA+IDApIHtcbiAgICBpZihwIDwgdGhpcy5EQiAmJiAoZCA9IHRoaXNbaV0+PnApICE9ICh0aGlzLnMmdGhpcy5ETSk+PnApXG4gICAgICByW2srK10gPSBkfCh0aGlzLnM8PCh0aGlzLkRCLXApKTtcbiAgICB3aGlsZShpID49IDApIHtcbiAgICAgIGlmKHAgPCA4KSB7XG4gICAgICAgIGQgPSAodGhpc1tpXSYoKDE8PHApLTEpKTw8KDgtcCk7XG4gICAgICAgIGQgfD0gdGhpc1stLWldPj4ocCs9dGhpcy5EQi04KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBkID0gKHRoaXNbaV0+PihwLT04KSkmMHhmZjtcbiAgICAgICAgaWYocCA8PSAwKSB7IHAgKz0gdGhpcy5EQjsgLS1pOyB9XG4gICAgICB9XG4gICAgICBpZigoZCYweDgwKSAhPSAwKSBkIHw9IC0yNTY7XG4gICAgICBpZihrID09IDAgJiYgKHRoaXMucyYweDgwKSAhPSAoZCYweDgwKSkgKytrO1xuICAgICAgaWYoayA+IDAgfHwgZCAhPSB0aGlzLnMpIHJbaysrXSA9IGQ7XG4gICAgfVxuICB9XG4gIHJldHVybiByO1xufVxuXG5mdW5jdGlvbiBibkVxdWFscyhhKSB7IHJldHVybih0aGlzLmNvbXBhcmVUbyhhKT09MCk7IH1cbmZ1bmN0aW9uIGJuTWluKGEpIHsgcmV0dXJuKHRoaXMuY29tcGFyZVRvKGEpPDApP3RoaXM6YTsgfVxuZnVuY3Rpb24gYm5NYXgoYSkgeyByZXR1cm4odGhpcy5jb21wYXJlVG8oYSk+MCk/dGhpczphOyB9XG5cbi8vIChwcm90ZWN0ZWQpIHIgPSB0aGlzIG9wIGEgKGJpdHdpc2UpXG5mdW5jdGlvbiBibnBCaXR3aXNlVG8oYSxvcCxyKSB7XG4gIHZhciBpLCBmLCBtID0gTWF0aC5taW4oYS50LHRoaXMudCk7XG4gIGZvcihpID0gMDsgaSA8IG07ICsraSkgcltpXSA9IG9wKHRoaXNbaV0sYVtpXSk7XG4gIGlmKGEudCA8IHRoaXMudCkge1xuICAgIGYgPSBhLnMmdGhpcy5ETTtcbiAgICBmb3IoaSA9IG07IGkgPCB0aGlzLnQ7ICsraSkgcltpXSA9IG9wKHRoaXNbaV0sZik7XG4gICAgci50ID0gdGhpcy50O1xuICB9XG4gIGVsc2Uge1xuICAgIGYgPSB0aGlzLnMmdGhpcy5ETTtcbiAgICBmb3IoaSA9IG07IGkgPCBhLnQ7ICsraSkgcltpXSA9IG9wKGYsYVtpXSk7XG4gICAgci50ID0gYS50O1xuICB9XG4gIHIucyA9IG9wKHRoaXMucyxhLnMpO1xuICByLmNsYW1wKCk7XG59XG5cbi8vIChwdWJsaWMpIHRoaXMgJiBhXG5mdW5jdGlvbiBvcF9hbmQoeCx5KSB7IHJldHVybiB4Jnk7IH1cbmZ1bmN0aW9uIGJuQW5kKGEpIHsgdmFyIHIgPSBuYmkoKTsgdGhpcy5iaXR3aXNlVG8oYSxvcF9hbmQscik7IHJldHVybiByOyB9XG5cbi8vIChwdWJsaWMpIHRoaXMgfCBhXG5mdW5jdGlvbiBvcF9vcih4LHkpIHsgcmV0dXJuIHh8eTsgfVxuZnVuY3Rpb24gYm5PcihhKSB7IHZhciByID0gbmJpKCk7IHRoaXMuYml0d2lzZVRvKGEsb3Bfb3Iscik7IHJldHVybiByOyB9XG5cbi8vIChwdWJsaWMpIHRoaXMgXiBhXG5mdW5jdGlvbiBvcF94b3IoeCx5KSB7IHJldHVybiB4Xnk7IH1cbmZ1bmN0aW9uIGJuWG9yKGEpIHsgdmFyIHIgPSBuYmkoKTsgdGhpcy5iaXR3aXNlVG8oYSxvcF94b3Iscik7IHJldHVybiByOyB9XG5cbi8vIChwdWJsaWMpIHRoaXMgJiB+YVxuZnVuY3Rpb24gb3BfYW5kbm90KHgseSkgeyByZXR1cm4geCZ+eTsgfVxuZnVuY3Rpb24gYm5BbmROb3QoYSkgeyB2YXIgciA9IG5iaSgpOyB0aGlzLmJpdHdpc2VUbyhhLG9wX2FuZG5vdCxyKTsgcmV0dXJuIHI7IH1cblxuLy8gKHB1YmxpYykgfnRoaXNcbmZ1bmN0aW9uIGJuTm90KCkge1xuICB2YXIgciA9IG5iaSgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy50OyArK2kpIHJbaV0gPSB0aGlzLkRNJn50aGlzW2ldO1xuICByLnQgPSB0aGlzLnQ7XG4gIHIucyA9IH50aGlzLnM7XG4gIHJldHVybiByO1xufVxuXG4vLyAocHVibGljKSB0aGlzIDw8IG5cbmZ1bmN0aW9uIGJuU2hpZnRMZWZ0KG4pIHtcbiAgdmFyIHIgPSBuYmkoKTtcbiAgaWYobiA8IDApIHRoaXMuclNoaWZ0VG8oLW4scik7IGVsc2UgdGhpcy5sU2hpZnRUbyhuLHIpO1xuICByZXR1cm4gcjtcbn1cblxuLy8gKHB1YmxpYykgdGhpcyA+PiBuXG5mdW5jdGlvbiBiblNoaWZ0UmlnaHQobikge1xuICB2YXIgciA9IG5iaSgpO1xuICBpZihuIDwgMCkgdGhpcy5sU2hpZnRUbygtbixyKTsgZWxzZSB0aGlzLnJTaGlmdFRvKG4scik7XG4gIHJldHVybiByO1xufVxuXG4vLyByZXR1cm4gaW5kZXggb2YgbG93ZXN0IDEtYml0IGluIHgsIHggPCAyXjMxXG5mdW5jdGlvbiBsYml0KHgpIHtcbiAgaWYoeCA9PSAwKSByZXR1cm4gLTE7XG4gIHZhciByID0gMDtcbiAgaWYoKHgmMHhmZmZmKSA9PSAwKSB7IHggPj49IDE2OyByICs9IDE2OyB9XG4gIGlmKCh4JjB4ZmYpID09IDApIHsgeCA+Pj0gODsgciArPSA4OyB9XG4gIGlmKCh4JjB4ZikgPT0gMCkgeyB4ID4+PSA0OyByICs9IDQ7IH1cbiAgaWYoKHgmMykgPT0gMCkgeyB4ID4+PSAyOyByICs9IDI7IH1cbiAgaWYoKHgmMSkgPT0gMCkgKytyO1xuICByZXR1cm4gcjtcbn1cblxuLy8gKHB1YmxpYykgcmV0dXJucyBpbmRleCBvZiBsb3dlc3QgMS1iaXQgKG9yIC0xIGlmIG5vbmUpXG5mdW5jdGlvbiBibkdldExvd2VzdFNldEJpdCgpIHtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMudDsgKytpKVxuICAgIGlmKHRoaXNbaV0gIT0gMCkgcmV0dXJuIGkqdGhpcy5EQitsYml0KHRoaXNbaV0pO1xuICBpZih0aGlzLnMgPCAwKSByZXR1cm4gdGhpcy50KnRoaXMuREI7XG4gIHJldHVybiAtMTtcbn1cblxuLy8gcmV0dXJuIG51bWJlciBvZiAxIGJpdHMgaW4geFxuZnVuY3Rpb24gY2JpdCh4KSB7XG4gIHZhciByID0gMDtcbiAgd2hpbGUoeCAhPSAwKSB7IHggJj0geC0xOyArK3I7IH1cbiAgcmV0dXJuIHI7XG59XG5cbi8vIChwdWJsaWMpIHJldHVybiBudW1iZXIgb2Ygc2V0IGJpdHNcbmZ1bmN0aW9uIGJuQml0Q291bnQoKSB7XG4gIHZhciByID0gMCwgeCA9IHRoaXMucyZ0aGlzLkRNO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy50OyArK2kpIHIgKz0gY2JpdCh0aGlzW2ldXngpO1xuICByZXR1cm4gcjtcbn1cblxuLy8gKHB1YmxpYykgdHJ1ZSBpZmYgbnRoIGJpdCBpcyBzZXRcbmZ1bmN0aW9uIGJuVGVzdEJpdChuKSB7XG4gIHZhciBqID0gTWF0aC5mbG9vcihuL3RoaXMuREIpO1xuICBpZihqID49IHRoaXMudCkgcmV0dXJuKHRoaXMucyE9MCk7XG4gIHJldHVybigodGhpc1tqXSYoMTw8KG4ldGhpcy5EQikpKSE9MCk7XG59XG5cbi8vIChwcm90ZWN0ZWQpIHRoaXMgb3AgKDE8PG4pXG5mdW5jdGlvbiBibnBDaGFuZ2VCaXQobixvcCkge1xuICB2YXIgciA9IEJpZ0ludGVnZXIuT05FLnNoaWZ0TGVmdChuKTtcbiAgdGhpcy5iaXR3aXNlVG8ocixvcCxyKTtcbiAgcmV0dXJuIHI7XG59XG5cbi8vIChwdWJsaWMpIHRoaXMgfCAoMTw8bilcbmZ1bmN0aW9uIGJuU2V0Qml0KG4pIHsgcmV0dXJuIHRoaXMuY2hhbmdlQml0KG4sb3Bfb3IpOyB9XG5cbi8vIChwdWJsaWMpIHRoaXMgJiB+KDE8PG4pXG5mdW5jdGlvbiBibkNsZWFyQml0KG4pIHsgcmV0dXJuIHRoaXMuY2hhbmdlQml0KG4sb3BfYW5kbm90KTsgfVxuXG4vLyAocHVibGljKSB0aGlzIF4gKDE8PG4pXG5mdW5jdGlvbiBibkZsaXBCaXQobikgeyByZXR1cm4gdGhpcy5jaGFuZ2VCaXQobixvcF94b3IpOyB9XG5cbi8vIChwcm90ZWN0ZWQpIHIgPSB0aGlzICsgYVxuZnVuY3Rpb24gYm5wQWRkVG8oYSxyKSB7XG4gIHZhciBpID0gMCwgYyA9IDAsIG0gPSBNYXRoLm1pbihhLnQsdGhpcy50KTtcbiAgd2hpbGUoaSA8IG0pIHtcbiAgICBjICs9IHRoaXNbaV0rYVtpXTtcbiAgICByW2krK10gPSBjJnRoaXMuRE07XG4gICAgYyA+Pj0gdGhpcy5EQjtcbiAgfVxuICBpZihhLnQgPCB0aGlzLnQpIHtcbiAgICBjICs9IGEucztcbiAgICB3aGlsZShpIDwgdGhpcy50KSB7XG4gICAgICBjICs9IHRoaXNbaV07XG4gICAgICByW2krK10gPSBjJnRoaXMuRE07XG4gICAgICBjID4+PSB0aGlzLkRCO1xuICAgIH1cbiAgICBjICs9IHRoaXMucztcbiAgfVxuICBlbHNlIHtcbiAgICBjICs9IHRoaXMucztcbiAgICB3aGlsZShpIDwgYS50KSB7XG4gICAgICBjICs9IGFbaV07XG4gICAgICByW2krK10gPSBjJnRoaXMuRE07XG4gICAgICBjID4+PSB0aGlzLkRCO1xuICAgIH1cbiAgICBjICs9IGEucztcbiAgfVxuICByLnMgPSAoYzwwKT8tMTowO1xuICBpZihjID4gMCkgcltpKytdID0gYztcbiAgZWxzZSBpZihjIDwgLTEpIHJbaSsrXSA9IHRoaXMuRFYrYztcbiAgci50ID0gaTtcbiAgci5jbGFtcCgpO1xufVxuXG4vLyAocHVibGljKSB0aGlzICsgYVxuZnVuY3Rpb24gYm5BZGQoYSkgeyB2YXIgciA9IG5iaSgpOyB0aGlzLmFkZFRvKGEscik7IHJldHVybiByOyB9XG5cbi8vIChwdWJsaWMpIHRoaXMgLSBhXG5mdW5jdGlvbiBiblN1YnRyYWN0KGEpIHsgdmFyIHIgPSBuYmkoKTsgdGhpcy5zdWJUbyhhLHIpOyByZXR1cm4gcjsgfVxuXG4vLyAocHVibGljKSB0aGlzICogYVxuZnVuY3Rpb24gYm5NdWx0aXBseShhKSB7IHZhciByID0gbmJpKCk7IHRoaXMubXVsdGlwbHlUbyhhLHIpOyByZXR1cm4gcjsgfVxuXG4vLyAocHVibGljKSB0aGlzIC8gYVxuZnVuY3Rpb24gYm5EaXZpZGUoYSkgeyB2YXIgciA9IG5iaSgpOyB0aGlzLmRpdlJlbVRvKGEscixudWxsKTsgcmV0dXJuIHI7IH1cblxuLy8gKHB1YmxpYykgdGhpcyAlIGFcbmZ1bmN0aW9uIGJuUmVtYWluZGVyKGEpIHsgdmFyIHIgPSBuYmkoKTsgdGhpcy5kaXZSZW1UbyhhLG51bGwscik7IHJldHVybiByOyB9XG5cbi8vIChwdWJsaWMpIFt0aGlzL2EsdGhpcyVhXVxuZnVuY3Rpb24gYm5EaXZpZGVBbmRSZW1haW5kZXIoYSkge1xuICB2YXIgcSA9IG5iaSgpLCByID0gbmJpKCk7XG4gIHRoaXMuZGl2UmVtVG8oYSxxLHIpO1xuICByZXR1cm4gbmV3IEFycmF5KHEscik7XG59XG5cbi8vIChwcm90ZWN0ZWQpIHRoaXMgKj0gbiwgdGhpcyA+PSAwLCAxIDwgbiA8IERWXG5mdW5jdGlvbiBibnBETXVsdGlwbHkobikge1xuICB0aGlzW3RoaXMudF0gPSB0aGlzLmFtKDAsbi0xLHRoaXMsMCwwLHRoaXMudCk7XG4gICsrdGhpcy50O1xuICB0aGlzLmNsYW1wKCk7XG59XG5cbi8vIChwcm90ZWN0ZWQpIHRoaXMgKz0gbiA8PCB3IHdvcmRzLCB0aGlzID49IDBcbmZ1bmN0aW9uIGJucERBZGRPZmZzZXQobix3KSB7XG4gIHdoaWxlKHRoaXMudCA8PSB3KSB0aGlzW3RoaXMudCsrXSA9IDA7XG4gIHRoaXNbd10gKz0gbjtcbiAgd2hpbGUodGhpc1t3XSA+PSB0aGlzLkRWKSB7XG4gICAgdGhpc1t3XSAtPSB0aGlzLkRWO1xuICAgIGlmKCsrdyA+PSB0aGlzLnQpIHRoaXNbdGhpcy50KytdID0gMDtcbiAgICArK3RoaXNbd107XG4gIH1cbn1cblxuLy8gQSBcIm51bGxcIiByZWR1Y2VyXG5mdW5jdGlvbiBOdWxsRXhwKCkge31cbmZ1bmN0aW9uIG5Ob3AoeCkgeyByZXR1cm4geDsgfVxuZnVuY3Rpb24gbk11bFRvKHgseSxyKSB7IHgubXVsdGlwbHlUbyh5LHIpOyB9XG5mdW5jdGlvbiBuU3FyVG8oeCxyKSB7IHguc3F1YXJlVG8ocik7IH1cblxuTnVsbEV4cC5wcm90b3R5cGUuY29udmVydCA9IG5Ob3A7XG5OdWxsRXhwLnByb3RvdHlwZS5yZXZlcnQgPSBuTm9wO1xuTnVsbEV4cC5wcm90b3R5cGUubXVsVG8gPSBuTXVsVG87XG5OdWxsRXhwLnByb3RvdHlwZS5zcXJUbyA9IG5TcXJUbztcblxuLy8gKHB1YmxpYykgdGhpc15lXG5mdW5jdGlvbiBiblBvdyhlKSB7IHJldHVybiB0aGlzLmV4cChlLG5ldyBOdWxsRXhwKCkpOyB9XG5cbi8vIChwcm90ZWN0ZWQpIHIgPSBsb3dlciBuIHdvcmRzIG9mIFwidGhpcyAqIGFcIiwgYS50IDw9IG5cbi8vIFwidGhpc1wiIHNob3VsZCBiZSB0aGUgbGFyZ2VyIG9uZSBpZiBhcHByb3ByaWF0ZS5cbmZ1bmN0aW9uIGJucE11bHRpcGx5TG93ZXJUbyhhLG4scikge1xuICB2YXIgaSA9IE1hdGgubWluKHRoaXMudCthLnQsbik7XG4gIHIucyA9IDA7IC8vIGFzc3VtZXMgYSx0aGlzID49IDBcbiAgci50ID0gaTtcbiAgd2hpbGUoaSA+IDApIHJbLS1pXSA9IDA7XG4gIHZhciBqO1xuICBmb3IoaiA9IHIudC10aGlzLnQ7IGkgPCBqOyArK2kpIHJbaSt0aGlzLnRdID0gdGhpcy5hbSgwLGFbaV0scixpLDAsdGhpcy50KTtcbiAgZm9yKGogPSBNYXRoLm1pbihhLnQsbik7IGkgPCBqOyArK2kpIHRoaXMuYW0oMCxhW2ldLHIsaSwwLG4taSk7XG4gIHIuY2xhbXAoKTtcbn1cblxuLy8gKHByb3RlY3RlZCkgciA9IFwidGhpcyAqIGFcIiB3aXRob3V0IGxvd2VyIG4gd29yZHMsIG4gPiAwXG4vLyBcInRoaXNcIiBzaG91bGQgYmUgdGhlIGxhcmdlciBvbmUgaWYgYXBwcm9wcmlhdGUuXG5mdW5jdGlvbiBibnBNdWx0aXBseVVwcGVyVG8oYSxuLHIpIHtcbiAgLS1uO1xuICB2YXIgaSA9IHIudCA9IHRoaXMudCthLnQtbjtcbiAgci5zID0gMDsgLy8gYXNzdW1lcyBhLHRoaXMgPj0gMFxuICB3aGlsZSgtLWkgPj0gMCkgcltpXSA9IDA7XG4gIGZvcihpID0gTWF0aC5tYXgobi10aGlzLnQsMCk7IGkgPCBhLnQ7ICsraSlcbiAgICByW3RoaXMudCtpLW5dID0gdGhpcy5hbShuLWksYVtpXSxyLDAsMCx0aGlzLnQraS1uKTtcbiAgci5jbGFtcCgpO1xuICByLmRyU2hpZnRUbygxLHIpO1xufVxuXG4vLyBCYXJyZXR0IG1vZHVsYXIgcmVkdWN0aW9uXG5mdW5jdGlvbiBCYXJyZXR0KG0pIHtcbiAgLy8gc2V0dXAgQmFycmV0dFxuICB0aGlzLnIyID0gbmJpKCk7XG4gIHRoaXMucTMgPSBuYmkoKTtcbiAgQmlnSW50ZWdlci5PTkUuZGxTaGlmdFRvKDIqbS50LHRoaXMucjIpO1xuICB0aGlzLm11ID0gdGhpcy5yMi5kaXZpZGUobSk7XG4gIHRoaXMubSA9IG07XG59XG5cbmZ1bmN0aW9uIGJhcnJldHRDb252ZXJ0KHgpIHtcbiAgaWYoeC5zIDwgMCB8fCB4LnQgPiAyKnRoaXMubS50KSByZXR1cm4geC5tb2QodGhpcy5tKTtcbiAgZWxzZSBpZih4LmNvbXBhcmVUbyh0aGlzLm0pIDwgMCkgcmV0dXJuIHg7XG4gIGVsc2UgeyB2YXIgciA9IG5iaSgpOyB4LmNvcHlUbyhyKTsgdGhpcy5yZWR1Y2Uocik7IHJldHVybiByOyB9XG59XG5cbmZ1bmN0aW9uIGJhcnJldHRSZXZlcnQoeCkgeyByZXR1cm4geDsgfVxuXG4vLyB4ID0geCBtb2QgbSAoSEFDIDE0LjQyKVxuZnVuY3Rpb24gYmFycmV0dFJlZHVjZSh4KSB7XG4gIHguZHJTaGlmdFRvKHRoaXMubS50LTEsdGhpcy5yMik7XG4gIGlmKHgudCA+IHRoaXMubS50KzEpIHsgeC50ID0gdGhpcy5tLnQrMTsgeC5jbGFtcCgpOyB9XG4gIHRoaXMubXUubXVsdGlwbHlVcHBlclRvKHRoaXMucjIsdGhpcy5tLnQrMSx0aGlzLnEzKTtcbiAgdGhpcy5tLm11bHRpcGx5TG93ZXJUbyh0aGlzLnEzLHRoaXMubS50KzEsdGhpcy5yMik7XG4gIHdoaWxlKHguY29tcGFyZVRvKHRoaXMucjIpIDwgMCkgeC5kQWRkT2Zmc2V0KDEsdGhpcy5tLnQrMSk7XG4gIHguc3ViVG8odGhpcy5yMix4KTtcbiAgd2hpbGUoeC5jb21wYXJlVG8odGhpcy5tKSA+PSAwKSB4LnN1YlRvKHRoaXMubSx4KTtcbn1cblxuLy8gciA9IHheMiBtb2QgbTsgeCAhPSByXG5mdW5jdGlvbiBiYXJyZXR0U3FyVG8oeCxyKSB7IHguc3F1YXJlVG8ocik7IHRoaXMucmVkdWNlKHIpOyB9XG5cbi8vIHIgPSB4KnkgbW9kIG07IHgseSAhPSByXG5mdW5jdGlvbiBiYXJyZXR0TXVsVG8oeCx5LHIpIHsgeC5tdWx0aXBseVRvKHkscik7IHRoaXMucmVkdWNlKHIpOyB9XG5cbkJhcnJldHQucHJvdG90eXBlLmNvbnZlcnQgPSBiYXJyZXR0Q29udmVydDtcbkJhcnJldHQucHJvdG90eXBlLnJldmVydCA9IGJhcnJldHRSZXZlcnQ7XG5CYXJyZXR0LnByb3RvdHlwZS5yZWR1Y2UgPSBiYXJyZXR0UmVkdWNlO1xuQmFycmV0dC5wcm90b3R5cGUubXVsVG8gPSBiYXJyZXR0TXVsVG87XG5CYXJyZXR0LnByb3RvdHlwZS5zcXJUbyA9IGJhcnJldHRTcXJUbztcblxuLy8gKHB1YmxpYykgdGhpc15lICUgbSAoSEFDIDE0Ljg1KVxuZnVuY3Rpb24gYm5Nb2RQb3coZSxtKSB7XG4gIHZhciBpID0gZS5iaXRMZW5ndGgoKSwgaywgciA9IG5idigxKSwgejtcbiAgaWYoaSA8PSAwKSByZXR1cm4gcjtcbiAgZWxzZSBpZihpIDwgMTgpIGsgPSAxO1xuICBlbHNlIGlmKGkgPCA0OCkgayA9IDM7XG4gIGVsc2UgaWYoaSA8IDE0NCkgayA9IDQ7XG4gIGVsc2UgaWYoaSA8IDc2OCkgayA9IDU7XG4gIGVsc2UgayA9IDY7XG4gIGlmKGkgPCA4KVxuICAgIHogPSBuZXcgQ2xhc3NpYyhtKTtcbiAgZWxzZSBpZihtLmlzRXZlbigpKVxuICAgIHogPSBuZXcgQmFycmV0dChtKTtcbiAgZWxzZVxuICAgIHogPSBuZXcgTW9udGdvbWVyeShtKTtcblxuICAvLyBwcmVjb21wdXRhdGlvblxuICB2YXIgZyA9IG5ldyBBcnJheSgpLCBuID0gMywgazEgPSBrLTEsIGttID0gKDE8PGspLTE7XG4gIGdbMV0gPSB6LmNvbnZlcnQodGhpcyk7XG4gIGlmKGsgPiAxKSB7XG4gICAgdmFyIGcyID0gbmJpKCk7XG4gICAgei5zcXJUbyhnWzFdLGcyKTtcbiAgICB3aGlsZShuIDw9IGttKSB7XG4gICAgICBnW25dID0gbmJpKCk7XG4gICAgICB6Lm11bFRvKGcyLGdbbi0yXSxnW25dKTtcbiAgICAgIG4gKz0gMjtcbiAgICB9XG4gIH1cblxuICB2YXIgaiA9IGUudC0xLCB3LCBpczEgPSB0cnVlLCByMiA9IG5iaSgpLCB0O1xuICBpID0gbmJpdHMoZVtqXSktMTtcbiAgd2hpbGUoaiA+PSAwKSB7XG4gICAgaWYoaSA+PSBrMSkgdyA9IChlW2pdPj4oaS1rMSkpJmttO1xuICAgIGVsc2Uge1xuICAgICAgdyA9IChlW2pdJigoMTw8KGkrMSkpLTEpKTw8KGsxLWkpO1xuICAgICAgaWYoaiA+IDApIHcgfD0gZVtqLTFdPj4odGhpcy5EQitpLWsxKTtcbiAgICB9XG5cbiAgICBuID0gaztcbiAgICB3aGlsZSgodyYxKSA9PSAwKSB7IHcgPj49IDE7IC0tbjsgfVxuICAgIGlmKChpIC09IG4pIDwgMCkgeyBpICs9IHRoaXMuREI7IC0tajsgfVxuICAgIGlmKGlzMSkge1x0Ly8gcmV0ID09IDEsIGRvbid0IGJvdGhlciBzcXVhcmluZyBvciBtdWx0aXBseWluZyBpdFxuICAgICAgZ1t3XS5jb3B5VG8ocik7XG4gICAgICBpczEgPSBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB3aGlsZShuID4gMSkgeyB6LnNxclRvKHIscjIpOyB6LnNxclRvKHIyLHIpOyBuIC09IDI7IH1cbiAgICAgIGlmKG4gPiAwKSB6LnNxclRvKHIscjIpOyBlbHNlIHsgdCA9IHI7IHIgPSByMjsgcjIgPSB0OyB9XG4gICAgICB6Lm11bFRvKHIyLGdbd10scik7XG4gICAgfVxuXG4gICAgd2hpbGUoaiA+PSAwICYmIChlW2pdJigxPDxpKSkgPT0gMCkge1xuICAgICAgei5zcXJUbyhyLHIyKTsgdCA9IHI7IHIgPSByMjsgcjIgPSB0O1xuICAgICAgaWYoLS1pIDwgMCkgeyBpID0gdGhpcy5EQi0xOyAtLWo7IH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHoucmV2ZXJ0KHIpO1xufVxuXG4vLyAocHVibGljKSBnY2QodGhpcyxhKSAoSEFDIDE0LjU0KVxuZnVuY3Rpb24gYm5HQ0QoYSkge1xuICB2YXIgeCA9ICh0aGlzLnM8MCk/dGhpcy5uZWdhdGUoKTp0aGlzLmNsb25lKCk7XG4gIHZhciB5ID0gKGEuczwwKT9hLm5lZ2F0ZSgpOmEuY2xvbmUoKTtcbiAgaWYoeC5jb21wYXJlVG8oeSkgPCAwKSB7IHZhciB0ID0geDsgeCA9IHk7IHkgPSB0OyB9XG4gIHZhciBpID0geC5nZXRMb3dlc3RTZXRCaXQoKSwgZyA9IHkuZ2V0TG93ZXN0U2V0Qml0KCk7XG4gIGlmKGcgPCAwKSByZXR1cm4geDtcbiAgaWYoaSA8IGcpIGcgPSBpO1xuICBpZihnID4gMCkge1xuICAgIHguclNoaWZ0VG8oZyx4KTtcbiAgICB5LnJTaGlmdFRvKGcseSk7XG4gIH1cbiAgd2hpbGUoeC5zaWdudW0oKSA+IDApIHtcbiAgICBpZigoaSA9IHguZ2V0TG93ZXN0U2V0Qml0KCkpID4gMCkgeC5yU2hpZnRUbyhpLHgpO1xuICAgIGlmKChpID0geS5nZXRMb3dlc3RTZXRCaXQoKSkgPiAwKSB5LnJTaGlmdFRvKGkseSk7XG4gICAgaWYoeC5jb21wYXJlVG8oeSkgPj0gMCkge1xuICAgICAgeC5zdWJUbyh5LHgpO1xuICAgICAgeC5yU2hpZnRUbygxLHgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHkuc3ViVG8oeCx5KTtcbiAgICAgIHkuclNoaWZ0VG8oMSx5KTtcbiAgICB9XG4gIH1cbiAgaWYoZyA+IDApIHkubFNoaWZ0VG8oZyx5KTtcbiAgcmV0dXJuIHk7XG59XG5cbi8vIChwcm90ZWN0ZWQpIHRoaXMgJSBuLCBuIDwgMl4yNlxuZnVuY3Rpb24gYm5wTW9kSW50KG4pIHtcbiAgaWYobiA8PSAwKSByZXR1cm4gMDtcbiAgdmFyIGQgPSB0aGlzLkRWJW4sIHIgPSAodGhpcy5zPDApP24tMTowO1xuICBpZih0aGlzLnQgPiAwKVxuICAgIGlmKGQgPT0gMCkgciA9IHRoaXNbMF0lbjtcbiAgICBlbHNlIGZvcih2YXIgaSA9IHRoaXMudC0xOyBpID49IDA7IC0taSkgciA9IChkKnIrdGhpc1tpXSklbjtcbiAgcmV0dXJuIHI7XG59XG5cbi8vIChwdWJsaWMpIDEvdGhpcyAlIG0gKEhBQyAxNC42MSlcbmZ1bmN0aW9uIGJuTW9kSW52ZXJzZShtKSB7XG4gIHZhciBhYyA9IG0uaXNFdmVuKCk7XG4gIGlmKCh0aGlzLmlzRXZlbigpICYmIGFjKSB8fCBtLnNpZ251bSgpID09IDApIHJldHVybiBCaWdJbnRlZ2VyLlpFUk87XG4gIHZhciB1ID0gbS5jbG9uZSgpLCB2ID0gdGhpcy5jbG9uZSgpO1xuICB2YXIgYSA9IG5idigxKSwgYiA9IG5idigwKSwgYyA9IG5idigwKSwgZCA9IG5idigxKTtcbiAgd2hpbGUodS5zaWdudW0oKSAhPSAwKSB7XG4gICAgd2hpbGUodS5pc0V2ZW4oKSkge1xuICAgICAgdS5yU2hpZnRUbygxLHUpO1xuICAgICAgaWYoYWMpIHtcbiAgICAgICAgaWYoIWEuaXNFdmVuKCkgfHwgIWIuaXNFdmVuKCkpIHsgYS5hZGRUbyh0aGlzLGEpOyBiLnN1YlRvKG0sYik7IH1cbiAgICAgICAgYS5yU2hpZnRUbygxLGEpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZighYi5pc0V2ZW4oKSkgYi5zdWJUbyhtLGIpO1xuICAgICAgYi5yU2hpZnRUbygxLGIpO1xuICAgIH1cbiAgICB3aGlsZSh2LmlzRXZlbigpKSB7XG4gICAgICB2LnJTaGlmdFRvKDEsdik7XG4gICAgICBpZihhYykge1xuICAgICAgICBpZighYy5pc0V2ZW4oKSB8fCAhZC5pc0V2ZW4oKSkgeyBjLmFkZFRvKHRoaXMsYyk7IGQuc3ViVG8obSxkKTsgfVxuICAgICAgICBjLnJTaGlmdFRvKDEsYyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmKCFkLmlzRXZlbigpKSBkLnN1YlRvKG0sZCk7XG4gICAgICBkLnJTaGlmdFRvKDEsZCk7XG4gICAgfVxuICAgIGlmKHUuY29tcGFyZVRvKHYpID49IDApIHtcbiAgICAgIHUuc3ViVG8odix1KTtcbiAgICAgIGlmKGFjKSBhLnN1YlRvKGMsYSk7XG4gICAgICBiLnN1YlRvKGQsYik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdi5zdWJUbyh1LHYpO1xuICAgICAgaWYoYWMpIGMuc3ViVG8oYSxjKTtcbiAgICAgIGQuc3ViVG8oYixkKTtcbiAgICB9XG4gIH1cbiAgaWYodi5jb21wYXJlVG8oQmlnSW50ZWdlci5PTkUpICE9IDApIHJldHVybiBCaWdJbnRlZ2VyLlpFUk87XG4gIGlmKGQuY29tcGFyZVRvKG0pID49IDApIHJldHVybiBkLnN1YnRyYWN0KG0pO1xuICBpZihkLnNpZ251bSgpIDwgMCkgZC5hZGRUbyhtLGQpOyBlbHNlIHJldHVybiBkO1xuICBpZihkLnNpZ251bSgpIDwgMCkgcmV0dXJuIGQuYWRkKG0pOyBlbHNlIHJldHVybiBkO1xufVxuXG52YXIgbG93cHJpbWVzID0gWzIsMyw1LDcsMTEsMTMsMTcsMTksMjMsMjksMzEsMzcsNDEsNDMsNDcsNTMsNTksNjEsNjcsNzEsNzMsNzksODMsODksOTcsMTAxLDEwMywxMDcsMTA5LDExMywxMjcsMTMxLDEzNywxMzksMTQ5LDE1MSwxNTcsMTYzLDE2NywxNzMsMTc5LDE4MSwxOTEsMTkzLDE5NywxOTksMjExLDIyMywyMjcsMjI5LDIzMywyMzksMjQxLDI1MSwyNTcsMjYzLDI2OSwyNzEsMjc3LDI4MSwyODMsMjkzLDMwNywzMTEsMzEzLDMxNywzMzEsMzM3LDM0NywzNDksMzUzLDM1OSwzNjcsMzczLDM3OSwzODMsMzg5LDM5Nyw0MDEsNDA5LDQxOSw0MjEsNDMxLDQzMyw0MzksNDQzLDQ0OSw0NTcsNDYxLDQ2Myw0NjcsNDc5LDQ4Nyw0OTEsNDk5LDUwMyw1MDldO1xudmFyIGxwbGltID0gKDE8PDI2KS9sb3dwcmltZXNbbG93cHJpbWVzLmxlbmd0aC0xXTtcblxuLy8gKHB1YmxpYykgdGVzdCBwcmltYWxpdHkgd2l0aCBjZXJ0YWludHkgPj0gMS0uNV50XG5mdW5jdGlvbiBibklzUHJvYmFibGVQcmltZSh0KSB7XG4gIHZhciBpLCB4ID0gdGhpcy5hYnMoKTtcbiAgaWYoeC50ID09IDEgJiYgeFswXSA8PSBsb3dwcmltZXNbbG93cHJpbWVzLmxlbmd0aC0xXSkge1xuICAgIGZvcihpID0gMDsgaSA8IGxvd3ByaW1lcy5sZW5ndGg7ICsraSlcbiAgICAgIGlmKHhbMF0gPT0gbG93cHJpbWVzW2ldKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYoeC5pc0V2ZW4oKSkgcmV0dXJuIGZhbHNlO1xuICBpID0gMTtcbiAgd2hpbGUoaSA8IGxvd3ByaW1lcy5sZW5ndGgpIHtcbiAgICB2YXIgbSA9IGxvd3ByaW1lc1tpXSwgaiA9IGkrMTtcbiAgICB3aGlsZShqIDwgbG93cHJpbWVzLmxlbmd0aCAmJiBtIDwgbHBsaW0pIG0gKj0gbG93cHJpbWVzW2orK107XG4gICAgbSA9IHgubW9kSW50KG0pO1xuICAgIHdoaWxlKGkgPCBqKSBpZihtJWxvd3ByaW1lc1tpKytdID09IDApIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4geC5taWxsZXJSYWJpbih0KTtcbn1cblxuLy8gKHByb3RlY3RlZCkgdHJ1ZSBpZiBwcm9iYWJseSBwcmltZSAoSEFDIDQuMjQsIE1pbGxlci1SYWJpbilcbmZ1bmN0aW9uIGJucE1pbGxlclJhYmluKHQpIHtcbiAgdmFyIG4xID0gdGhpcy5zdWJ0cmFjdChCaWdJbnRlZ2VyLk9ORSk7XG4gIHZhciBrID0gbjEuZ2V0TG93ZXN0U2V0Qml0KCk7XG4gIGlmKGsgPD0gMCkgcmV0dXJuIGZhbHNlO1xuICB2YXIgciA9IG4xLnNoaWZ0UmlnaHQoayk7XG4gIHQgPSAodCsxKT4+MTtcbiAgaWYodCA+IGxvd3ByaW1lcy5sZW5ndGgpIHQgPSBsb3dwcmltZXMubGVuZ3RoO1xuICB2YXIgYSA9IG5iaSgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgdDsgKytpKSB7XG4gICAgYS5mcm9tSW50KGxvd3ByaW1lc1tpXSk7XG4gICAgdmFyIHkgPSBhLm1vZFBvdyhyLHRoaXMpO1xuICAgIGlmKHkuY29tcGFyZVRvKEJpZ0ludGVnZXIuT05FKSAhPSAwICYmIHkuY29tcGFyZVRvKG4xKSAhPSAwKSB7XG4gICAgICB2YXIgaiA9IDE7XG4gICAgICB3aGlsZShqKysgPCBrICYmIHkuY29tcGFyZVRvKG4xKSAhPSAwKSB7XG4gICAgICAgIHkgPSB5Lm1vZFBvd0ludCgyLHRoaXMpO1xuICAgICAgICBpZih5LmNvbXBhcmVUbyhCaWdJbnRlZ2VyLk9ORSkgPT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYoeS5jb21wYXJlVG8objEpICE9IDApIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIHByb3RlY3RlZFxuQmlnSW50ZWdlci5wcm90b3R5cGUuY2h1bmtTaXplID0gYm5wQ2h1bmtTaXplO1xuQmlnSW50ZWdlci5wcm90b3R5cGUudG9SYWRpeCA9IGJucFRvUmFkaXg7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tUmFkaXggPSBibnBGcm9tUmFkaXg7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5mcm9tTnVtYmVyID0gYm5wRnJvbU51bWJlcjtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmJpdHdpc2VUbyA9IGJucEJpdHdpc2VUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLmNoYW5nZUJpdCA9IGJucENoYW5nZUJpdDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmFkZFRvID0gYm5wQWRkVG87XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5kTXVsdGlwbHkgPSBibnBETXVsdGlwbHk7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5kQWRkT2Zmc2V0ID0gYm5wREFkZE9mZnNldDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5TG93ZXJUbyA9IGJucE11bHRpcGx5TG93ZXJUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5VXBwZXJUbyA9IGJucE11bHRpcGx5VXBwZXJUbztcbkJpZ0ludGVnZXIucHJvdG90eXBlLm1vZEludCA9IGJucE1vZEludDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLm1pbGxlclJhYmluID0gYm5wTWlsbGVyUmFiaW47XG5cbi8vIHB1YmxpY1xuQmlnSW50ZWdlci5wcm90b3R5cGUuY2xvbmUgPSBibkNsb25lO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuaW50VmFsdWUgPSBibkludFZhbHVlO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuYnl0ZVZhbHVlID0gYm5CeXRlVmFsdWU7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5zaG9ydFZhbHVlID0gYm5TaG9ydFZhbHVlO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuc2lnbnVtID0gYm5TaWdOdW07XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS50b0J5dGVBcnJheSA9IGJuVG9CeXRlQXJyYXk7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5lcXVhbHMgPSBibkVxdWFscztcbkJpZ0ludGVnZXIucHJvdG90eXBlLm1pbiA9IGJuTWluO1xuQmlnSW50ZWdlci5wcm90b3R5cGUubWF4ID0gYm5NYXg7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5hbmQgPSBibkFuZDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLm9yID0gYm5PcjtcbkJpZ0ludGVnZXIucHJvdG90eXBlLnhvciA9IGJuWG9yO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuYW5kTm90ID0gYm5BbmROb3Q7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3QgPSBibk5vdDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0TGVmdCA9IGJuU2hpZnRMZWZ0O1xuQmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRSaWdodCA9IGJuU2hpZnRSaWdodDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmdldExvd2VzdFNldEJpdCA9IGJuR2V0TG93ZXN0U2V0Qml0O1xuQmlnSW50ZWdlci5wcm90b3R5cGUuYml0Q291bnQgPSBibkJpdENvdW50O1xuQmlnSW50ZWdlci5wcm90b3R5cGUudGVzdEJpdCA9IGJuVGVzdEJpdDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLnNldEJpdCA9IGJuU2V0Qml0O1xuQmlnSW50ZWdlci5wcm90b3R5cGUuY2xlYXJCaXQgPSBibkNsZWFyQml0O1xuQmlnSW50ZWdlci5wcm90b3R5cGUuZmxpcEJpdCA9IGJuRmxpcEJpdDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmFkZCA9IGJuQWRkO1xuQmlnSW50ZWdlci5wcm90b3R5cGUuc3VidHJhY3QgPSBiblN1YnRyYWN0O1xuQmlnSW50ZWdlci5wcm90b3R5cGUubXVsdGlwbHkgPSBibk11bHRpcGx5O1xuQmlnSW50ZWdlci5wcm90b3R5cGUuZGl2aWRlID0gYm5EaXZpZGU7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5yZW1haW5kZXIgPSBiblJlbWFpbmRlcjtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmRpdmlkZUFuZFJlbWFpbmRlciA9IGJuRGl2aWRlQW5kUmVtYWluZGVyO1xuQmlnSW50ZWdlci5wcm90b3R5cGUubW9kUG93ID0gYm5Nb2RQb3c7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnZlcnNlID0gYm5Nb2RJbnZlcnNlO1xuQmlnSW50ZWdlci5wcm90b3R5cGUucG93ID0gYm5Qb3c7XG5CaWdJbnRlZ2VyLnByb3RvdHlwZS5nY2QgPSBibkdDRDtcbkJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJvYmFibGVQcmltZSA9IGJuSXNQcm9iYWJsZVByaW1lO1xuXG4vLyBCaWdJbnRlZ2VyIGludGVyZmFjZXMgbm90IGltcGxlbWVudGVkIGluIGpzYm46XG5cbi8vIEJpZ0ludGVnZXIoaW50IHNpZ251bSwgYnl0ZVtdIG1hZ25pdHVkZSlcbi8vIGRvdWJsZSBkb3VibGVWYWx1ZSgpXG4vLyBmbG9hdCBmbG9hdFZhbHVlKClcbi8vIGludCBoYXNoQ29kZSgpXG4vLyBsb25nIGxvbmdWYWx1ZSgpXG4vLyBzdGF0aWMgQmlnSW50ZWdlciB2YWx1ZU9mKGxvbmcgdmFsKVxuXG4vLy8gTUVURU9SIFdSQVBQRVJcbnJldHVybiBCaWdJbnRlZ2VyO1xufSkoKTtcbiJdfQ==
