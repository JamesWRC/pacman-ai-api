// Get the cache set by Cloudflare.
let cache = caches.default


addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(event) {
  return await getCache(event);
}



async function updateCache(event, registeredOrg, userKey) {
  try{
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
      if(!registeredOrg){  
        response = unauthorised()
      }

      event.waitUntil(cache.put(new URL(String(event.request.url) + String(userKey)), response.clone()))
      return response
    }catch (err){
      return new Response(String(err), {status: 200})
    }
  }

async function getCache(event){
  try{
    var userKey = ""
    userKey = event.request.headers.get("userKey")
    if(!userKey){

      // User has not specified the 'userKey' header. 
      var error = JSON.stringify({"error": "'userKey' header not specified. This key is geven to you on signing up your organization. This key is required for all requests, in combination with your TLS cert and key."})

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
      }catch (err){
        const params = {}
          const url = new URL(event.request.url)
          const queryString = url.search.slice(1).split('&')

          queryString.forEach(item => {
            const kv = item.split('=')
            if (kv[0]) params[kv[0]] = kv[1] || true
          })
          if(params.userKey){
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
        if(!registeredOrg){  
          response = unauthorised()
        }
        await updateCache(event, registeredOrg, userKey)
        cacheData = response
        return response.clone()
      } else {


        return cacheData
  }
}

function unauthorised(){
  // If the user has not got a valid key
  // Apply 401 to a bad license.
  var error = JSON.stringify({"error":"User Not Authenticated."})

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