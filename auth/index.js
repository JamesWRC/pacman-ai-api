const { createAppAuth } = require("@octokit/auth-app");


// Get the cache set by Cloudflare.
let cache = caches.default


addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const uri = url.pathname;
  if (uri.includes("generatePAT") && event.request.method === 'GET') {
    event.respondWith(generatePAT(event))

  } else {
    event.respondWith(handleRequest(event))
  }
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(event) {
  return await getCache(event);
}



async function updateCache(event, registeredOrg, userKey) {
  try {
    // Check if the cached object exists

    // const sessionID = event.request.headers.get("sessionID")
    // const serverID = event.request.headers.get("serverID")
    // if (serverID == null || sessionID == null){
    //   return respondWithError()
    // }

    // Set the cache
    var jsonBody = registeredOrg
    var response = new Response(jsonBody, {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"

      },
      method: 'GET',
      statusText: "Cache HIT"
    })
    response.headers.set("Content-Type", "application/json")

    // If the user has not got a valid key
    // Apply 401 to a bad license.
    if (!registeredOrg) {
      response = unauthorised()
    }

    event.waitUntil(cache.put(new URL(String(event.request.url) + String(userKey)), response.clone()))
    return response
  } catch (err) {
    return new Response(String(err), { status: 200 })
  }
}

async function getCache(event) {
  try {
    var userKey = ""
    userKey = event.request.headers.get("userKey")
    if (!userKey) {

      // User has not specified the 'userKey' header. 
      var error = JSON.stringify({ "error": "'userKey' header not specified. This key is geven to you on signing up your organization. This key is required for all requests, in combination with your TLS cert and key." })

      return new Response(error,
        {
          headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"
          },
          method: 'GET',
          statusText: "User Not Authenticated.",
          status: 401
        })
    }
  } catch (err) {
    const params = {}
    const url = new URL(event.request.url)
    const queryString = url.search.slice(1).split('&')

    queryString.forEach(item => {
      const kv = item.split('=')
      if (kv[0]) params[kv[0]] = kv[1] || true
    })
    if (params.userKey) {
      userKey = params.userKey
    }
  }


  // Get the cached data using the URL as the key.
  var cacheData = await cache.match(new URL(String(event.request.url) + String(userKey)))

  // Check if the cached object exists
  if (!cacheData) {

    // Stringify the body for the response and format it for the cache.
    const registeredOrg = await LICENSE.get(String(userKey))


    var jsonBody = registeredOrg

    var response = new Response(jsonBody, {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"
      },
      method: 'GET',
      statusText: "Not Cached"
    })
    // If the user has not got a valid key
    // Apply 401 to a bad license.
    if (!registeredOrg) {
      response = unauthorised()
    }
    await updateCache(event, registeredOrg, userKey)
    cacheData = response
    return response.clone()
  } else {


    return cacheData
  }
}

function unauthorised() {
  // If the user has not got a valid key
  // Apply 401 to a bad license.
  var error = JSON.stringify({ "error": "User Not Authenticated." })

  return new Response(error,
    {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"
      },
      method: 'GET',
      statusText: "User Not Authenticated.",
      status: 401
    }
  )
}

async function generateGitJWT() {
  var pacmManPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxLphRxGukab0T\notegP+zbKbjcso2aNxxBkB0TEo9ilT3a9yKAMo3rt8UKCZmkqdw045Pfsc3D10Bl\ngrxVBvvwDssW0Wmc3fapDiVJgAh3TvJE4TuPmEfvDxDJDwARv4KzIZ8j1rsUvUlg\nQIYfki59w5K7wkmUq61+se81iYWoQVxuqKGg0yF17xEgHPG6yrIUH1PRjvupTLNx\nDB76qbWXql1PerwBkV+DTRzItl0bjuA8OZi06Qs5BfSSZCTsHpD318k+qk59Ijhw\n7U5vJvMjlyo9FqH260TKTk3yGZr8jHnROIZkzJM7psUfttJjlrHUQkZ7aj+Atp2o\nd67cvdBjAgMBAAECggEAeBzqTaQmhNLZxtIB8zTi0MA7/gFdVUo+8YNM8n0GjwI1\naJdY4CdlZoKyJNfVPHeaPJB60o6quzTVBvvVyJ5vdJHSw6k7O4iNipV4WZdeJeNz\nAZbe1b2aJknES0jL9zwo0l7cj2MmeCzJ7WJQil6C/ebzNi3Dy/GGL/lX/Kc54JEs\nzb9yo51CG8xuiYWtZHvh2zpcoLHr7S4NsNyKQh+Dun4/MVjTLj+OWfCAj5KbnGHw\nhNl+2ZE62AGfd8FutVqDS3gcaaJd4Yondq8AWAk8CNslcKYX34aGT55uS6Iepq6g\nVPQe/oUs5A2jPQGlgsSasqlOVEXYU+dVT4zWHmfLoQKBgQDoMFe7SdoTYDHpGj1O\n8kPXK1Tmaxc7Y5UfWYWrWmP+JbEPwtKIw/CBZka/lnoVOVVn9+ZG123WWKB83OFk\nDEQHdqaWeut9mpfLntNNOOAMe16rRVVVK1Jpis+ruOXOuws/xX7E5v5Az9+UGFr1\nUbHRbFdR2F6QLLN0v4NL33fKtwKBgQDDWig9bCex//1PWwN7itGKuof0yvHV5aOx\nsUTiOHl+9vm7K6sxhHa7QWEFxdHqopoDz0X/3Sh7psW4pt6oIJcGNXVIyfm7FODl\nunxV2gz6yhtTi6kA+revTiBO3jo3Gq8HpB6vhXrpqIrgqpVa6ZfRIQU/jv4PSst9\nmMGlsjdrtQKBgQDQ79+im3xv/xoqpwAQcJV3pHiLuEZ5nMzuHwLYBUkBxC0m/6uw\ngpGD/+MeOGy3eJZQLpW7ndQrFCmm8qSoARmelbimpQoQRvLduphuXwXOdZ3lBUka\nkRdh/hWOc53ogAxJYJEI4sxcyjJo89m188PNrm6NKeU+W9tI7aVau0by1QKBgBak\nYH2eB4vOC+IivmiXUmot7Iwm6ZjNIQf7b+x4dzyMC63yBcmbfNd/YGt23jm/1vIS\nGB7r10FdtxUL4krCXD7P+2QQZO2WIer+jmK0/0QiIMCyM0h1xsx+1afOghjY8uiD\n0Tqu0ew7KL2Zh+4dnQcUOLOBM1k6ZhOMnQVDfsDxAoGAezCY9D3t2F080GoecjGY\nPjo0s1ZXk2NAA6o17Ll3VDguJ1J3tVttnEluzofr716QAyIVqEfr3EDQeApNjrx8\nEEJ3MUH/2Zlp5DKvQImfE7Lwtd4yg1HKLwQhFfWyXw8PI0fkdL+6h5U53AofPElj\ngYyTSVPSZjQiNNHfMdSIYS8=\n-----END PRIVATE KEY-----"

  const auth = createAppAuth({
    appId: PACMAN_AI_GIT_APP_ID,
    privateKey: pacmManPrivateKey,
    clientId: PACMAN_AI_GIT_APP_CLIENT_ID,
    clientSecret: PACMAN_AI_GIT_APP_CLIENT_SECRET,
  });

  const appAuthentication = await auth({ type: "app" });

  return appAuthentication;
}

async function generatePAT(event) {
  const isAuthed = await getCache(event);
  console.log(isAuthed)
  if (isAuthed.status === 401) {
    return isAuthed
  }
  const JWToken = await generateGitJWT();
  console.log(JWToken)
  console.log(JWToken.token)
  const PATURL = `https://api.github.com/app/installations/${PACMAN_GIT_APP_INSTALL_ID}/access_tokens`
  const PATInit = {
    headers: {
      "Authorization": "Bearer " + String(JWToken.token),
      'Accept': "application/vnd.github.v3+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "PostmanRuntime/7.26.8",
    },
    method: "POST",
    body: JSON.stringify({
      permissions: {
        // contents: "read",
        metadata: "read",
        packages: "read",
        // statuses: "write",
        // actions:"write",
        // administration:"write",
        // checks:"write",
        // deployments:"write",
        // environments:"write",
        // issues:"write",
        // pages:"write",
        // pull_requests:"write",
        // repository_hooks:"write",
        // repository_projects:"write",
        // secret_scanning_alerts:"write",
        // secrets:"write",
        // security_events:"write",
        // vulnerability_alerts:"write",
        // workflows:"write",
        // members:"write",
        // organization_administration:"write",
        // organization_hooks:"write",
        // organization_plan:"write",
        // organization_projects:"write",
        organization_packages:"read",
        // organization_secrets:"write",
        // organization_self_hosted_runners:"write",
        // organization_user_blocking:"write",
        // team_discussions:"write",
        
      },
      repositories: ['pacman-ai-runner'],
      repository_ids: [299838186],
    })
  }
  const tokenResp = await fetch(new URL(PATURL), PATInit);
  const gitHubPAT = JSON.parse(await tokenResp.text())


  console.log(gitHubPAT)

  const token = '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' // Only has read access to packages.


  return new Response(JSON.stringify({'success':true, 'token':token}),
    {
      status: 200
    }
  )

}

