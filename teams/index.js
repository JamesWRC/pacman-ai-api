let cache = caches.default
const maxTempTeamTTL = 600
const maxTeamListCache = 3600000 // 1 hour in ms
const generatedTeamPasswordMaxLength = 8; // Number of chars in the password

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const uri = url.pathname;
  console.log(uri)
  if (event.request.method === 'OPTIONS') {
    event.respondWith(new Response("ok", {
      headers: {
        "access-Control-Allow-Origin": "*",
        "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
        "content-type": "application/json;charset=UTF-8",
      }
    }))
  } else if (uri.includes("register") && event.request.method === 'POST') {

    event.respondWith(checkteam(event))
  } else if (uri.includes("updateTeam") && event.request.method === 'POST') {
    event.respondWith(getAllTeams(event, false))

  } else if (uri.includes("signup") && event.request.method === 'POST') {
    event.respondWith(signup(event))
  } else {
    event.respondWith(new Response("Hello"))
  }

})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(event) {
  return await checkteam(event);
}

// **************************************************


// **************************************************
async function signup(event) {
  // return new Response("JSON.stringify(body)", {
  //             headers: {
  //                 "access-Control-Allow-Origin":"*",
  //                 "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
  //                 "content-type": "application/json;charset=UTF-8",
  //             }
  //     })
  const teamDataCacheURL = "https://api.pacman.ai/getTeamCache"
  // Check to see if response has been cached before
  const cacheResponse = await cache.match(new URL(teamDataCacheURL))
  var body = await getBody(cacheResponse)

  if (!body) {
    const resp = await getAllTeams(event, true);
    body = await getBody(resp)
  }


  console.log(body)

  const requestBody = await getBody(event.request)

  // This is the temp teamname, the actual team name will be 'selectedName' in the body.
  const tempTeamName = requestBody.teamID
  const teamName = requestBody.selectedName

  // Check to see if the team exists, then add to cache
  if (tempTeamName && !body["teamData"].hasOwnProperty(tempTeamName)) {
    const valueAndMetadata = await TEAMS.getWithMetadata(tempTeamName)
    const value = valueAndMetadata.value
    const metadata = valueAndMetadata.metadata

    // add item to cache
    body["teamData"][tempTeamName] = metadata

    await addAndUpdateCache(event, body);
  }

  // // Check to see if the team exists, then add to cache
  // if (teamName && !body["teamData"].hasOwnProperty(teamName)){
  //     const valueAndMetadata = await TEAMS.getWithMetadata(teamName)
  //     const value = valueAndMetadata.value
  //     const metadata = valueAndMetadata.metadata

  //     // add item to cache
  //     body["teamData"][teamName] = metadata

  //     await addAndUpdateCache(event, body);
  // }
  try {
    if (body["teamData"][tempTeamName]["gitHubAppInstallID"]) {
      // Do nothing
    }
  } catch (err) {
    //  Return error of singup timedout
    return new Response(JSON.stringify({ "success": false, "errorCode": 1003, "msg": "Your sign up session timed out. Try again.", }), {
      headers: {
        "access-Control-Allow-Origin": "*",
        "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
        "content-type": "application/json;charset=UTF-8",
      }
    })
  }
  try {
    // Check the tempTeamName and see if the record exists and is waiting to be created and turned into a 'real' team
    if (body["teamData"].hasOwnProperty(tempTeamName) && body["teamData"][tempTeamName]["gitHubAppInstallID"] === "none") {

      // Check that the sent team name 'selectedName' does not currently exist.
      if (!body["teamData"].hasOwnProperty(teamName)) {

        const createdTeamData = await createTeam(event, teamName, false, requestBody)

        return new Response(JSON.stringify(createdTeamData), {
          headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            "content-type": "application/json;charset=UTF-8",
          }
        })

      } else {
        console.log("b")
        console.log(body["teamData"].hasOwnProperty(teamName))
        console.log(teamName)
        console.log(body["teamData"][teamName])
        //  Return error of taken name
        return new Response(JSON.stringify({ "success": false, "errorCode": 1001, "msg": "Team name '" + String(teamName) + "' is not available. Please try another team name.", }), {
          headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            "content-type": "application/json;charset=UTF-8",
          }
        })
      }

    } else {
      //  Return error of taken name
      return new Response(JSON.stringify({ "success": false, "errorCode": 1002, "msg": "There was an error signing up, please try again in a bit.", }), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        }
      })

    }
  } catch (err) {
    console.log("test err")
    console.log(err)
    return new Response(JSON.stringify({ "success": false, "errorCode": 1002, "msg": "There was an error signing up, please try again in a bit.", }), {
      headers: {
        "access-Control-Allow-Origin": "*",
        "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
        "content-type": "application/json;charset=UTF-8",
      }
    })
  }

  // // console.log(valueAndMetadata)
  // if (value && metadata["gitHubAppInstallID"] === "none"){
  //     return new Response(JSON.stringify(metadata), {
  //             headers: {
  //                 "access-Control-Allow-Origin":"*",
  //                 "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
  //                 "content-type": "application/json;charset=UTF-8",
  //             }
  //     })
  // }else{
  //     return new Response(JSON.stringify({"success": false, "error": "Team not found."}), {
  //             headers: {
  //                 "access-Control-Allow-Origin":"*",
  //                 "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
  //                 "content-type": "application/json;charset=UTF-8",
  //             }
  //     }) 
  // }  

}

async function addAndUpdateCache(event, dataToCache) {
  const teamDataCacheURL = "https://api.pacman.ai/getTeamCache"

  var teamsList = { "cachedAt": Date.now() + maxTeamListCache, "listKVReqCount": dataToCache["listKVReqCount"]++, "numTeams": dataToCache["numTeams"]++, "teamData": dataToCache["teamData"] }
  const jsonTeamList = JSON.stringify(teamsList);
  const cacheResponse = new Response(jsonTeamList, {
    headers: {
      "access-Control-Allow-Origin": "*",
      "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
      "content-type": "application/json;charset=UTF-8",
    }
  })
  const a = await cache.put(new URL(teamDataCacheURL), cacheResponse.clone())
}

async function getAllTeams(event, forceRegen) {
  const teamDataCacheURL = "https://api.pacman.ai/getTeamCache"
  // Check to see if response has been cached before
  const cacheResponse = await cache.match(new URL(teamDataCacheURL))

  const body = await getBody(cacheResponse)
  var lastCachedTime = 0
  try {
    lastCachedTime = body.cachedAt || 0;
  } catch (err) {
    console.log("No cache object found, compiling... saving to cache.")
  }
  if (!forceRegen && cacheResponse && lastCachedTime !== 0 && lastCachedTime >= Date.now()) {

    console.log("returning cache")
    try {
      return new Response(JSON.stringify(body), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        }
      })
    } catch (err) {
      return new Response(err)
    }
    // No team data in cache, regenerate.
  } else {
    console.log("updating cache")
    try {
      var teamsList = { "cachedAt": Date.now() + maxTeamListCache, "listKVReqCount": 0, "numTeams": 0, "teamData": {} }
      var cursor = ""
      var listKVReqCount = 0
      do {
        var teamListTemp;
        // check if there is more, or simply get a list with the default limit
        if (cursor) {
          teamListTemp = await TEAMS.list({ "cursor": cursor })
        } else {
          teamListTemp = await TEAMS.list()
        }
        // Iterate through all teams and add to a dict.
        for (var teamIndex in teamListTemp.keys) {
          const teamName = teamListTemp.keys[teamIndex].name
          const teamMetaData = teamListTemp.keys[teamIndex].metadata
          teamsList["teamData"][teamName] = teamMetaData
          teamsList["numTeams"] += 1
        }

        teamsList["listKVReqCount"] += 1

        cursor = teamListTemp.cursor || ""


      } while (!teamListTemp.list_complete);
      // jsonify teamdata and cache
      const jsonTeamList = JSON.stringify(teamsList);
      const cacheResponse = new Response(jsonTeamList, {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        }
      })
      console.log("updating cache")
      const a = await cache.put(new URL(teamDataCacheURL), cacheResponse.clone())
      console.log(a)
      console.log("saved....")
      // console.log(jsonTeamList)

      return cacheResponse;

    } catch (err) {
      return new Response(err)
    }
  }
}

async function getBody(request) {
  try {
    const body = await request.text()
    return JSON.parse(body)
  } catch (err) {
    return ""
  }
}

// **************************************************

async function generateSession() {
  const seed = String(Date.now()) +
    String(Math.ceil(Math.random() * 9999999999999999))
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(seed)

  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // convert bytes to hex string
  const hashHex =
    hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
  return hashHex
}

// Will create a new team and passback a pre generated password.
async function createTeam(event, name, isTeampTeam, gitHubData) {

  var metaData = {
    "createdAt": Date.now(),
    "teamName": "tempTeamName",
    "runningScore": 0,
    "numberOfWins:": 0,
    "numberOfLoses": 0,
    "numberOfDraws": 0,
    "numberOfGamesPlayed": 0,
    "numberOfGamesSubmitted": 0,
    "numberOfTournamentsPlayed": 0,
    "lastGameTime": 0,
    "gitHubAppInstallID": "none",
    "gitHubUsername": "none",
    "countryCode": event.request.cf.country
  }
  var data = {
    "password": "temp"
  }
  if (isTeampTeam) {
    data = {
      "password": "temp"
    }
  } else {
    metaData.gitHubAppInstallID = gitHubData.gitHubInstallID
    // create team with pass
    const hash = await generateSession()
    const generatedPassword = String(hash).substring(0, generatedTeamPasswordMaxLength);

    data = {
      "password": generatedPassword,
      "test": gitHubData.gitHubInstallID
    }
  }


  const team = await TEAMS.put(String(name), JSON.stringify(data), { expirationTtl: maxTempTeamTTL, metadata: metaData });
  console.log("zzzzzzzz")
  console.log(metaData)
  return { "success": true, "teamCreated": true, "teamName": String(name) }

}

async function checkteam(event) {
  try {
    // generate a session, if one exists then create a new one untill no collision.
    do {
      // Regenerate hash if collision, if this happens, thats lotto luck.
      var hash = await generateSession();
      // Check to see if hash already exists, check for collision
      var team = await TEAMS.get(hash);

    } while (team);

    // Since the team does not exist create a new temp one.
    const createdTeamData = await createTeam(event, hash, true, null);

    return new Response(JSON.stringify(createdTeamData), {
      headers: {
        "access-Control-Allow-Origin": "*",
        "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
        "content-type": "application/json;charset=UTF-8",
      }
    })
  } catch (err) {
    return new Response(err)
  }

}