const crypto = require("node:crypto");

const SESSION_COOKIE_NAME = "bpad_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseCookies(req) {
  const rawCookie = req?.headers?.cookie || "";

  return rawCookie.split(";").reduce((cookies, part) => {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(valueParts.join("=") || "");
    return cookies;
  }, {});
}

function serializeCookie(name, value, maxAge = SESSION_MAX_AGE_SECONDS) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV !== "development") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function createSessionToken(user) {
  const payload = {
    username: user.username,
    displayName: user.displayName,
    accessScope: user.accessScope,
    bidangCode: user.bidangCode || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !getSessionSecret()) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function getAuthenticatedUser(req) {
  const cookies = parseCookies(req);
  const payload = verifySessionToken(cookies[SESSION_COOKIE_NAME]);

  if (!payload) {
    return null;
  }

  return payload;
}

function setSessionCookie(res, user) {
  const token = createSessionToken(user);
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, token));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE_NAME, "", 0));
}

module.exports = {
  clearSessionCookie,
  getAuthenticatedUser,
  setSessionCookie,
};
