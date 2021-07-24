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
    event.respondWith(getAllTeams(event, false, false))

  }else if (uri.includes("getTeamNames") && event.request.method === 'GET') {
    event.respondWith(getAllTeams(event, true, true))

  } else if (uri.includes("signup") && event.request.method === 'POST') {
    event.respondWith(signup(event))
  } else if (uri.includes("authTeam") && event.request.method === 'POST') {
    event.respondWith(authenticate(event))
  }  else if (uri.includes("githubAppWebHook") && event.request.method === 'POST') {
    event.respondWith(gitHubAppHooks(event))
  }  else if (uri.includes("gitHubInstallData") && event.request.method === 'GET') {
    event.respondWith(getGitHubData(event))
  }  else if (uri.includes("exchangeGitToken") && event.request.method === 'POST') {
    event.respondWith(setGitUserToken(event))

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

async function authenticate(event) {

  try{

    const requestBody = await getBody(event.request)

    const team = JSON.parse(await TEAMS.get(requestBody.teamName))

    if(team.password === requestBody.teamPass){

      return new Response(JSON.stringify({"success": true, "authenticated":true}), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        }
      })
    }else{
      return new Response(JSON.stringify({"success": true, "authenticated":false}), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        }
      })
    }

  }catch(err){
    console.log(err)
    return new Response(JSON.stringify({"success": false, "authenticated":false, "error": "An error occurred."}), {
      headers: {
        "access-Control-Allow-Origin": "*",
        "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
        "content-type": "application/json;charset=UTF-8",
      }
    })
  }

}

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
    const resp = await getAllTeams(event, true, false);
    body = await getBody(resp)
  }


  console.log(body)

  const requestBody = await getBody(event.request)

  // This is the temp teamname, the actual team name will be 'selectedName' in the body.
  const tempTeamName = requestBody.teamID
  const teamName = requestBody.selectedName
  const gitToken = requestBody.gitToken
  const gitInstallID = requestBody.gitInstallID
  const gitRepoSelected = requestBody.gitRepoSelected
  const gitUsername = requestBody.gitUsername

  // Check to see if the team exists, then add to cache
  // if (tempTeamName && !body["teamData"].hasOwnProperty(tempTeamName)) {
  //   const valueAndMetadata = await TEAMS.getWithMetadata(tempTeamName)
  //   const value = valueAndMetadata.value
  //   const metadata = valueAndMetadata.metadata

  //   // add item to cache
  //   body["teamData"][tempTeamName] = metadata

  //   await addAndUpdateCache(event, body);
  // }

  // // Check to see if the team exists, then add to cache
  // if (teamName && !body["teamData"].hasOwnProperty(teamName)){
  //     const valueAndMetadata = await TEAMS.getWithMetadata(teamName)
  //     const value = valueAndMetadata.value
  //     const metadata = valueAndMetadata.metadata

  //     // add item to cache
  //     body["teamData"][teamName] = metadata

  //     // await addAndUpdateCache(event, body);
  // }
  // try {
  //   if (body["teamData"][tempTeamName]["gitHubAppInstallID"]) {
  //     // Do nothing
  //   }
  // } catch (err) {
  //   //  Return error of singup timedout
  //   return new Response(JSON.stringify({ "success": false, "errorCode": 1003, "msg": "Your sign up session timed out. Try again.", }), {
  //     headers: {
  //       "access-Control-Allow-Origin": "*",
  //       "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
  //       "content-type": "application/json;charset=UTF-8",
  //     }
  //   })
  // }
  try {
    // Check the tempTeamName and see if the record exists and is waiting to be created and turned into a 'real' team
    const team = await TEAMS.get(teamName)
    // if (body["teamData"].hasOwnProperty(tempTeamName) && body["teamData"][tempTeamName]["gitHubAppInstallID"] === "none") {

      // Check that the sent team name  does not currently exist.
      if (team === null) {

        const createdTeamData = await createTeam(event, teamName, false, requestBody, gitToken, gitInstallID, gitRepoSelected, gitUsername)
        
        var country = "N/A"
        try{
          country = event.request.cf.country 
          }catch{
      
        }
        var defaultMetaData = {
          "createdAt": Date.now(),
          "teamName": teamName,
          "runningScore": 0,
          "numberOfWins:": 0,
          "numberOfLoses": 0,
          "numberOfDraws": 0,
          "numberOfGamesPlayed": 0,
          "numberOfGamesSubmitted": 0,
          "numberOfTournamentsPlayed": 0,
          "lastGameTime": 0,
          "gitHubAppInstallID": gitInstallID,
          "gitToken": gitToken,
          "gitRepo": gitRepoSelected,
          "gitUsername": gitUsername,
          "countryCode": country
        }
        body["teamData"][teamName] = defaultMetaData;
        await addAndUpdateCache(event, body)

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
        return new Response(JSON.stringify({ "success": false, "errorCode": 1001, "msg": "Team name '" + String(teamName) + "' is not available. Please try another team name."}), {
          headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            "content-type": "application/json;charset=UTF-8",
          }
        })
      }

    // } else {
    //   //  Return error of taken name
    //   return new Response(JSON.stringify({ "success": false, "errorCode": 1002, "msg": "There was an error signing up, please try again in a bit.", }), {
    //     headers: {
    //       "access-Control-Allow-Origin": "*",
    //       "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
    //       "content-type": "application/json;charset=UTF-8",
    //     }
    //   })

    // }
  } catch (err) {
    console.log("test err")
    console.log(err)
    return new Response(JSON.stringify({ "success": false, "errorCode": 1002, "msg": "There was an error signing up, please try again in a bit.", "team": teamName, "err":err}), {
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

async function getAllTeams(event, forceRegen, showSensitiveData) {
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
      if(!showSensitiveData){
        Object.keys(body['teamData']).forEach(e => {
          delete body['teamData'][e]['gitHubAppInstallID'];
          delete body['teamData'][e]['gitToken'];

        });
      }
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
      var jsonTeamList = teamsList;
      const cacheJsonTeamList = jsonTeamList;

      // remove sensitive data
      // console.log(JSON.stringify(jsonTeamList))
      if(!showSensitiveData){

        Object.keys(jsonTeamList['teamData']).forEach(e => {
          try{
          delete jsonTeamList['teamData'][e]['gitHubAppInstallID'];
          delete jsonTeamList['teamData'][e]['gitToken'];
          }catch(err){
            console.log(err)
          }

        });
      }

      const cacheEditedResponse = new Response(JSON.stringify(jsonTeamList), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        }
      })

      const cacheResponse = new Response(JSON.stringify(cacheJsonTeamList), {
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

      return cacheEditedResponse;

    } catch (err) {
      console.log("error")
      console.log(err)
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
async function createTeam(event, name, isTeampTeam, gitHubData, gitToken, gitInstallID, gitRepoSelected, gitUsername) {

  // create team with pass
  const hash = await generateSession()
  const generatedPassword = String(hash).substring(0, generatedTeamPasswordMaxLength);

  var country = "N/A"
  try{
    country = event.request.cf.country 
    }catch{

  }

  var metaData = {
    "createdAt": Date.now(),
    "teamName": name,
    "runningScore": 0,
    "numberOfWins:": 0,
    "numberOfLoses": 0,
    "numberOfDraws": 0,
    "numberOfGamesPlayed": 0,
    "numberOfGamesSubmitted": 0,
    "numberOfTournamentsPlayed": 0,
    "lastGameTime": 0,
    "gitHubAppInstallID": gitInstallID,
    "gitToken": gitToken,
    "gitRepo": gitRepoSelected,
    "gitUsername": gitUsername,
    "countryCode": country
  }
  
  var data = {
    "password": "temp"
  }
  if (isTeampTeam) {
    data = {
      "password": "temp"
    }
  } else {
    metaData.gitHubAppInstallID = gitHubData.gitInstallID

    data = {
      "password": generatedPassword,
    }
  }


  const team = await TEAMS.put(String(name), JSON.stringify(data), { metadata: metaData });
  console.log("zzzzzzzz")
  console.log(metaData)
  return { "success": true, "teamCreated": true, "teamName": String(name), "teamPass": generatedPassword }

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
    const createdTeamData = await createTeam(event, hash, true, null, null, null, null, null);

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


async function gitHubAppHooks(event){

  const url = new URL(event.request.url)
  console.log(url.toString())
  // if(url.toString().includes('secret=NotSoSecretSecret')){
    // const recievedSHA256Signature = event.request.headers.get('X-Hub-Signature-256');
    // if(recievedSHA256Signature !== ""){
      const respBody = await getBody(event.request);
      const action = respBody['action'];
      const installID = respBody['installation']['id'];
      if(action === "created"){
        await GITHUB.put(String(installID), JSON.stringify(respBody));

        return new Response(JSON.stringify({"success": false, "teamCreated": true}), {
          headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            "content-type": "application/json;charset=UTF-8",
          },
          status: 201,
        })

      }else if(action === "deleted"){
        const teamCache = await getAllTeams(event, true, true)
        const teamData = await getBody(teamCache)
        var tdata = "None"

        for(team in teamData['teamData']){
          if(String(teamData['teamData'][team]['gitHubAppInstallID']) === String(installID)){
            tdata = team
            await TEAMS.delete(String(team))
            await GITHUB.delete(String(installID))
            
          }
        }

      return new Response(JSON.stringify({"success": true, "deleted Team": tdata}), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        },
        status: 202,
      })

    }
  

  return new Response(JSON.stringify({"error": 'Bad Auth, check docs.', 'a': action}), {
    headers: {
      "access-Control-Allow-Origin": "*",
      "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
      "content-type": "application/json;charset=UTF-8",
    },
    status: 401,
  })
// }
  // }
}


async function getGitHubData(event){
  const bodyData = await getBody(event.request)
  const gitHubData = await GITHUB.get(bodyData.gitInstallID);
  var dataToSend = {"success": true, "gitData": JSON.parse(gitHubData)}

  if(!gitHubData){
    dataToSend = {"success": false, "gitData": JSON.stringify({})}
  }

  return new Response(JSON.stringify(dataToSend), {
    headers: {
      "access-Control-Allow-Origin": "*",
      "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
      "content-type": "application/json;charset=UTF-8",
    },
    status: 200,
  })
}


async function setGitUserToken(event){
  const bodyData = await getBody(event.request)
  const gitTokenRecieved = bodyData.gitCode;
  const gitIntsallID = bodyData.gitInstallID;

  const CLIENT_ID = PACMAN_AI_GIT_APP_CLIENT_ID
  const CLIENT_SECRET = PACMAN_AI_GIT_APP_CLIENT_SECRET
  const CODE = gitTokenRecieved
  var shouldFecthGitData = false;

  if(bodyData.getGitData === "repos"){
    shouldFecthGitData = true
  }


  const url = `https://github.com/login/oauth/access_token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${CODE}`
  const init = {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "PostmanRuntime/7.26.8",
      'Accept': 'application/vnd.github.v3+json'
    },
    method: "POST"
  }

  const tokenExchangeResponse = await fetch(url, init);

  const tokenExchangeBody = await getBody(tokenExchangeResponse);

  var dataToReturn = {'success':true, 'tokenResponse': tokenExchangeBody};

  if(shouldFecthGitData){
    const teamGitData = JSON.parse(await GITHUB.get(gitIntsallID));
    dataToReturn = {'success':true, 'tokenResponse': tokenExchangeBody, 'userRepos': teamGitData.repositories, 'gitUsername': teamGitData.installation.account.login};
  }

  if('access_token' in dataToReturn.tokenResponse){
    dataToReturn.success = true
  }else{
    dataToReturn.success = false
  }


  return new Response(JSON.stringify(dataToReturn), {
    headers: {
      "access-Control-Allow-Origin": "*",
      "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
      "content-type": "application/json;charset=UTF-8",
    },
    status: 200,
  })


}
