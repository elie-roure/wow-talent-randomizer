import https from 'https';

type TokenCache = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

let tokenCache: TokenCache | null = null;

async function requestClientTokenOnce(): Promise<{ access_token: string; expires_in: number }> {
  const clientID = process.env.BNET_CLIENT_ID;
  const clientSecret = process.env.BNET_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    throw new Error('BNET_CLIENT_ID and BNET_CLIENT_SECRET must be set to request a client_credentials token');
  }

  const auth = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');
  const postData = 'grant_type=client_credentials';

  const options: https.RequestOptions = {
    hostname: 'oauth.battle.net',
    path: '/token',
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
          resolve(parsed as { access_token: string; expires_in: number });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

export async function getClientCredentialsToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 10000 > now) {
    return tokenCache.accessToken;
  }

  const tokenResp = await requestClientTokenOnce();
  const expiresAt = Date.now() + tokenResp.expires_in * 1000;
  tokenCache = { accessToken: tokenResp.access_token, expiresAt };
  return tokenResp.access_token;
}

export async function fetchBlizzardData(path: string, opts?: { region?: string; namespace?: string; locale?: string }): Promise<any> {
  const region = opts?.region || process.env.BNET_REGION || 'us';
  const namespace = opts?.namespace || `static-${region}`;
  const locale = opts?.locale || 'en_US';

  const token = await getClientCredentialsToken();

  const query = `namespace=${encodeURIComponent(namespace)}&locale=${encodeURIComponent(locale)}`;
  const options: https.RequestOptions = {
    hostname: `${region}.api.blizzard.com`,
    path: `${path}?${query}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}
