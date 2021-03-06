const { createAppAuth } = require("@octokit/auth-app"); 


// Get the cache set by Cloudflare.
let cache = caches.default
const errorMsg = { "error" : "There was an error processing request, might be missing / bad headers."};
const valueTTL = 86400; // (24hrs) Seconds to live
const JOB_COMPLETED = 226;
function respondWithError(){
  return new Response(JSON.stringify(errorMsg),{ 
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"

        }})
}

async function updateCache(event, job, notCachedResponse) {
  try{
    // Check if the cached object exists

      const sessionID = event.request.headers.get("sessionID")
      const serverID = event.request.headers.get("serverID")
      if (serverID == null || sessionID == null){
        return respondWithError()
      }
      // Stringify the body for the response and format it for the cache.
      // var jsonBody = JSON.stringify({"cached": true, "sessionID": sessionID})
      // var response = new Response(jsonBody, { 
      // headers: event.request.headers,
      // method: 'GET',
      // body: data
      // })
      // Set the cache
      var jsonBody = JSON.stringify({"data": JSON.parse(job)})
      var response = new Response(jsonBody, { 
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID",
            "X-Cache": "HIT"
        },
        method: 'GET',
        statusText: "cached"
      })
      response.headers.set("Content-Type", "application/json")
      if(JSON.parse(job).completed === true){
        event.waitUntil(cache.put(new URL(String(event.request.url) + String(sessionID)), response.clone()))
        return response

      }else{
        // return notCachedResponse
      }
    }catch (err){
      return new Response(String(err), {status: 200})
    }
    
    }


async function getJob(event) {

  const url = event.request.url

	// Function to parse query strings
	function getParameterByName(name) {
		name = name.replace(/[\[\]]/g, '\\$&')
		name = name.replace(/\//g, '')
		var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
			results = regex.exec(url)

		if (!results) return null
		else if (!results[2]) return ''
		else if (results[2]) {
			results[2] = results[2].replace(/\//g, '')
		}
		
		return decodeURIComponent(results[2].replace(/\+/g, ' '));
	}


    var sessionID = event.request.headers.get("sessionID")
    if(!sessionID){
      sessionID = getParameterByName('sessionID')
    }
    var serverID = event.request.headers.get("serverID")
    if(!serverID){
      serverID = getParameterByName('serverID')
    }
    if(!serverID){
      return new Response(JSON.stringify({"error": 'Bad Auth, check docs.'}), {
        headers: {
          "access-Control-Allow-Origin": "*",
          "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
          "content-type": "application/json;charset=UTF-8",
        },
        status: 401,
      })
    }



//   // Get the cached data using the URL as the key.
//   var cacheData = await cache.match(new URL(String(event.request.url) + String(sessionID)))

//   // Check if the cached object exists
//   if (cacheData) {
//     return cacheData
//   }
  // We use messageBrokerMsg and the request mode headers to see if we should pull a message
  //  from the broker or directly from the KV.
  var messageBrokerMsg;
  if (event.request.headers.get("requestMode") !== "generate"){
    messageBrokerMsg = await getFromMessageBrokerService(event, sessionID);
  }

   if(messageBrokerMsg && messageBrokerMsg.status === 200){

      const mbsBody = await getBody(messageBrokerMsg);
      
      var mbsResponse = new Response(JSON.stringify({"service": "MB", "data":mbsBody}), { 
          headers: { 
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID, X-Cache",
            "X-Cache": "MISS",
            "msgID": event.request.headers.get("msgID")
            
          },
          statusText: "not cached"
        })
        console.log("GETTING UPDATE STATS")
        console.log(JSON.stringify(mbsBody))
        const sessionData = await QUEUE.getWithMetadata(String(sessionID))
        const session = JSON.parse(sessionData.value)
        // var session = JSON.parse(await QUEUE.get(String(sessionID)))

        if(session.completed){
          console.log("1")
          if(session.updatedTeamData){
            console.log("2")

            return mbsResponse
          }else{
            console.log("3")

            session['updatedTeamData'] = true
          }

        console.log("GAME FINISHED STATS")
        console.log(session.data.gameData[0])
        mbsResponse.headers.set("X-Cache", "HIT")
        console.log(mbsBody.data)
        const teamName = encodeURIComponent(session.data.gameData[0].redTeam);
        console.log(teamName)

        const team = await TEAMS.getWithMetadata(teamName);
        const teamBody = JSON.parse(team.value)
        var teamMetadata = team.metadata;
        var wins=0;
        var loses=0;
        var draws=0;
        for(var i = 0; i < session.data.gameResults.length; i++){
          const score = session.data.gameResults[i].gameScore
          if(score > 0){
            wins+=1;
          }else if(score < 0){
            loses += 1
          }else if(score === 0){
            draws += 1;
          }
        }
        // teamMetadata.runningScore = parseInt(teamMetadata.runningScore) + mbsBody.data.runningScore
        // teamMetadata.numberOfWins = parseInt(teamMetadata.numberOfWins) + wins
        // teamMetadata.numberOfLoses = parseInt(teamMetadata.numberOfLoses) + loses
        // teamMetadata.numberOfDraws = parseInt(teamMetadata.numberOfDraws) + loses
        // teamMetadata.numberOfGamesPlayed = parseInt(teamMetadata.numberOfGamesPlayed) + 1
        // teamMetadata.numberOfGamesSubmitted = parseInt(teamMetadata.numberOfGamesSubmitted) + 1        
        teamMetadata.runningScore += session.data.runningScore
        teamMetadata.numberOfWins += wins
        teamMetadata.numberOfLoses += loses
        teamMetadata.numberOfDraws += draws
        teamMetadata.numberOfGamesPlayed += 1
        teamMetadata.numberOfGamesSubmitted += 1
        teamMetadata.lastGameTime = Date.now()
        const updatedQueue = await QUEUE.put(String(sessionID), JSON.stringify(session), { expirationTtl: valueTTL, metadata: sessionData.metadata });
        const teams = await TEAMS.put(String(teamName), JSON.stringify(teamBody), { metadata: teamMetadata });
        mbsResponse = new Response(JSON.stringify({"service": "MB", "data":session}), { 
          headers: { 
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID, X-Cache",
            "X-Cache": "HIT",
            "msgID": event.request.headers.get("msgID")
            
          },
          statusText: "cached"
        })
        event.waitUntil(cache.put(new URL(String(event.request.url) + String(sessionID)), mbsResponse.clone()))
      }
      return mbsResponse
     
  }else{

    // try{
      // Get the sessionID from the POST body
      // var body = await event.request.headers.text()
      // body = JSON.parse(body)
    //   sessionID = ""
    //   try{
    //   sessionID = event.request.headers.get("sessionID")

    //   }catch (err){
    //     const params = {}
    //       const url = new URL(request.url)
    //       const queryString = url.search.slice(1).split('&')

    //       queryString.forEach(item => {
    //         const kv = item.split('=')
    //         if (kv[0]) params[kv[0]] = kv[1] || true
    //       })
    //       if(params.sessionID){
    //       sessionID = params.sessionID
    //   }
    //   }

      // Get the cached data using the URL as the key.
      var cacheData = await cache.match(new URL(String(event.request.url) + String(sessionID)))

      // Check if the cached object exists
      if (!cacheData){

          // Stringify the body for the response and format it for the cache.
          const job = await QUEUE.getWithMetadata(String(sessionID))
          const parsedJob = JSON.parse(job.value)

          
          parsedJob.data.metaData = job.metadata


          var jsonBody = JSON.stringify({"service": "KV", "data": parsedJob, "metaData":job.metadata})
    
          var response = new Response(jsonBody, { 
            headers: { 
              "content-type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
              "Access-Control-Max-Age": "86400",
              "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID",
              "X-Cache": "MISS"
            },
            statusText: "not cached"
          })


          if(parsedJob.completed){

            response.headers.set("X-Cache", "HIT")

            event.waitUntil(cache.put(new URL(String(event.request.url) + String(sessionID)), response.clone()))
          }

          return response.clone()
        } else {

          // var cacheBody = await cacheData.text()
          // var cacheBodyJson = JSON.parse(cacheBody)
          // var jsonBody = JSON.stringify(cacheBodyJson)
          // var response = new Response(jsonBody, { 
          //   headers: event.request.headers,
          //   method: 'GET',
          //   statusText: "Not Cached",
          //   body: JSON.parse(job)
          // })        

          return cacheData
        }
        // }catch (err){
        //   return new Response(JSON.stringify({"error": err}), { headers: { 
        //       "content-type": "application/json",
        //       "Access-Control-Allow-Origin": "*",
        //       "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        //       "Access-Control-Max-Age": "86400",
        //       "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID",
        //       "X-Cache": "MISS"
        //     },
        //     statusText: "not cached",status: 202})
        // }
    }

    }
async function getBody(request) {
  const body = await request.text()
  try {

    return JSON.parse(body)
  } catch (err) {
    return "None"
  }
}

async function updateJob(event) {

  const body = await getBody(event.request)

  const messageBrokerMsg = await sendMsgUsingMessageBrokerService(event, body);

   if(messageBrokerMsg.status === 200 && event.request.headers.get("completionStatus") !== "TRUE" ){
    //   return new Response(messageBrokerMsg.body, messageBrokerMsg)

    return new Response(messageBrokerMsg.body, { 
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"

        },
        method: 'GET',
        statusText: "Using messageBroker Service"
      })



    }



    if(event.request.headers.get("completionStatus") === "TRUE" || messageBrokerMsg.status !== 200){
            // return new Response("v", {status: 202})s

    try{
      // Get the sessionID from the POST body
      // var body = await event.request.headers.text()
      // body = JSON.parse(body)
      const sessionID = event.request.headers.get("sessionID")
      const serverID = event.request.headers.get("serverID")
      if (serverID == null || sessionID == null){
        return respondWithError()
      }

      // const body = await getBody(event.request)

      // // Get the cached data using the URL as the key.
      // var cacheData = await cache.match(new URL(String(event.request.url) + String(sessionID)))



      // var jsonBody = JSON.stringify({"cached": false, "data": JSON.parse(body)})
      // var response = new Response(jsonBody, { 
      //   headers: event.request.headers,
      //   method: 'GET',
      //   statusText: "Not Cached"
      // })
      body.data.metaData.gameEndTime = Date.now()
      const parsedBody = JSON.stringify(body)

      // var valueAndMetadata = await QUEUE.getWithMetadata(String(sessionID))

            
      await QUEUE.put(String(sessionID), parsedBody, {expirationTtl: valueTTL, metadata: JSON.stringify(body.data.metaData)});

      
      // await updateCache(event, parsedBody)
      var response = new Response(parsedBody, { 
        headers: { 
              "content-type": "application/json",
              "Access-Control-Allow-Origin":"*",
              "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype"
            },
            method: 'GET',
            statusText: "Updated"
          })
      return response
      // // Check if the cached object exists
      // if (!cacheData) {

      //     // Stringify the body for the response and format it for the cache.
      //     const job = await QUEUE.get(String(sessionID))
      //     var jsonBody = JSON.stringify({"cached": false, "data": JSON.parse(body)})
      //     var response = new Response(jsonBody, { 
      //       headers: event.request.headers,
      //       method: 'GET',
      //       statusText: "Not Cached"
      //     })
      //     response.headers.set("Content-Type", "application/json")
      //     await updateCache(event, job)
      //     cacheData = response
      //     return response.clone()
      //   } else {

      //     // var cacheBody = await cacheData.text()
      //     // var cacheBodyJson = JSON.parse(cacheBody)
      //     // var jsonBody = JSON.stringify(cacheBodyJson)
      //     // var response = new Response(jsonBody, { 
      //     //   headers: event.request.headers,
      //     //   method: 'GET',
      //     //   statusText: "Not Cached",
      //     //   body: JSON.parse(job)
      //     // })        

      //     return cacheData
      //   }
        }catch (err){
          return new Response(err, {status: 202})
        }
    }
    
    }

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const uri = url.pathname;
  
  if (event.request.method === 'OPTIONS') {
    return event.respondWith(new Response("OK", { 
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",

        }}))
  }else if (uri.includes('leaveQueue') && (event.request.method === 'GET' || event.request.method === 'OPTIONS')){
    return event.respondWith(leaveQueue(event))

  }else if (uri.includes('getqueuepos') && (event.request.method === 'GET' || event.request.method === 'OPTIONS')){

    return event.respondWith(getQueuePos(event))
  } else if (event.request.method === 'GET'){
    return event.respondWith(getJob(event))
  }else if (event.request.method === 'POST' ){
    return event.respondWith(updateJob(event))
  }
  event.respondWith(handleRequest(event))
})
// need to pass in sessionID to the body.
/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(event) {
  return getCache(event)
}

async function sendMsgUsingMessageBrokerService(event, body){
  
  
  const init = {
    body: JSON.stringify(body),
    method: "POST",
    headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, qbpass, msgID",
        "qbpass": QUEUE_BROKER_PASS,
        "msgID": event.request.headers.get("msgID")
    },
  }
  var baseUrl = "http://messagebroker.pacman.ai:8880/addMsg/";
  var url = "";
  const sessionID = event.request.headers.get("sessionID")
  url = baseUrl + sessionID
  console.log(url)

  return response = await fetch(new URL(url), init);
}


async function getFromMessageBrokerService(event, sessionID){

  const init = {
    headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, qbpass, msgID",
        "qbpass": QUEUE_BROKER_PASS,
        "msgID": event.request.headers.get("msgID")

    },
  }
  var baseUrl = "http://messagebroker.pacman.ai:8880/getMsg/";
  var url = "";
  // const sessionID = event.request.headers.get("sessionID")
  url = baseUrl + sessionID

  console.log(url)

  return response = await fetch(new URL(url), init);
}



async function generateGitJWT(){
  var pacmManPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCu+bfTspK9hVsA\n7s6gM+2R1OJiNQieg1kwL/44gvqg6iq6CXnGACI1njF08w4cR58U04SShj1fYUe8\nq5pmsR5wY27hnwwb4XAAk33Omuzf/mnMzP1xVgy5/Iukv3FDe8Rdm1OXPv3nGQ2D\nADbpGtwY03/qxBw14Cb6Vc8uG2xLIQInWk2sC+cVgosMjOWSo5F6z5tj/GrCl48H\nLIJMhIC4ozgsWOPvS3Du4Ziwgm2kiTDcq6KrYy56K9aVRSkqyKVms0JTbDiopaca\n4RGkAi5o1UPfxh8BTYK0CGFuFxR0d/GhbnWPIUBbyBzKnEDHWaeq/LIw9Q2ddac1\nce5WbvlTAgMBAAECggEAGLGTWOQNw4NreXE6Ze+OKpORs2xqn/xHfP548T7C4izK\nBOFLdz8TlN+TeT7IEgOllsnXHtqlFK3k8uKA8tcyRYgy4NKSYejp5prqGVtR7La5\n9bZEWldbim/ywThnYq+34cIHBQRVzuSBPKiuFy28PCC1H8u3c38D4TZ0+7vRB7UP\n74B3WTtohmnFs0UvhnS2WWO0Xl/e/lXi4cve+CmaRVm1IAAZxYTkKUEvxCwQFNYE\nQhNntNl/rCohg1LqSAyiAkXt2s4qvfr0CD1DLcHXlm9fmy1qIE6Xlt1LOCFIpBbg\nxqAE9pMcz4AHs2236n1E68jfRzqBPpiu/0z37ILysQKBgQDkj0Lp7MlmwswfjF70\naiJE4JsiiO0wpfp9MdvuYWwSnGmDIgVB7QSPx1fGLYCnKQxSxsLYuAW9GVyCBIW2\nyl03JjORu5yEQIIZbGIxXIPu7ormX7yh0d04FHMuqvmYykzBHuu+AktGv92MQ6nB\nlERDtk94D6S/jbiYJ02+12WzqwKBgQDD+46wV6M3nb3AauznHuvzVfm+oaW0qs1c\n6BZ1hrd8x//00fBiKivRkTvLqkmmWalmX27l5igXdaEy7Fo1ijeA/jXIw4sEzyrV\nJIJhNLn4Dx6o04PuV+mjPOJH88m711qGFAz7u+Mx3OHsWi3iwQO/bqmLR/yehUOd\ntibdONGo+QKBgAW7wkXz9qlpQY2ZC9i9wNZRfBLFtI1/3GS/l3DHaNqeqdbsR417\n0J16tqz1/0AyO2joK4McOqiftj5ctq37LZNwleKV/jsjEyBoI55xX63itgFJbYXx\nqcb6XFlTWKeIi5xcljVSAWlo7rnSCLQecAfyztOIMO3NNFA8zCp5ZMe5AoGAUSpv\nz+ybtj7oBTbDYnzV73Nd+Wts+0P5xU6Bbq8act1JzhTcX2tjtmlVwGWIFxLvK2y+\nuwv08rJOzo5AVggmMJAXqkwB2T4LWTbDoIp7spZgdj8TVrSmGGrwtCftFpR78yd+\nsQsBbvcxwfcfJdgWO0QTh5GKuAQtGrYDpn8PpdECgYEAq8B9Ag2OKcwbLmmSGWbi\nIqymYNg/3vi9eU9IqfWsYSLXBfF4xg4wNupUD7gx+do++mAdXQ9fzBk434HDhcL+\n5QMNHEP3w3XCjX+fX9fZ7pvO3EBYJ97oFUghrd3PuDUHbDrjvh1MjGbyjogomqNc\nFk6CVTqt4xyqf2xB7QEsEhw=\n-----END PRIVATE KEY-----\n"

  const auth = createAppAuth({
    appId: PACMAN_AI_GIT_APP_ID,
    privateKey: pacmManPrivateKey,
    clientId: PACMAN_AI_GIT_APP_CLIENT_ID,
    clientSecret: PACMAN_AI_GIT_APP_CLIENT_SECRET,
  });

  const appAuthentication = await auth({ type: "app" });

  return appAuthentication;
}

async function getQueuePos(event){
  const sessionIDDataReceived = event.request.headers.get("sessionID");
  if (!(sessionIDDataReceived.indexOf(':') > -1)){

    return new Response(JSON.stringify({"error": "No Org - sessionID pair sent, sessionID needs to be in a ORG:SESSIONID fashion."}), { 
      headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
          "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",

      }})
  }

  const org = sessionIDDataReceived.split(":")[0]
  const sessionID = sessionIDDataReceived // Due to...reasons...the sessionID sent to the QueueBroker must also include the org:session id pair...

  const init = {
    method: "GET",
    headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",
        
        "qbpass": QUEUE_BROKER_PASS
    },
}

console.log(`http://queuebroker.pacman.ai:8080/queuepos/${org}/${sessionID}`)
const response = await fetch(`http://queuebroker.pacman.ai:8080/queuepos/${org}/${sessionID}`, init);
const resp = await gatherResponse(response)
console.log(resp)
return new Response(JSON.stringify({'success':resp.success, 'queueData': { 'queuePosition':resp.queuePosition, 'inQueue':resp.inQueue, 'serverPool':resp.serverPool}}), {
  headers: {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",
    
  }
})

}

async function gatherResponse(response) {
  const { headers } = response
  const contentType = headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
      // return "Yes"
      return JSON.parse(JSON.stringify(await response.json()))
  }
  else if (contentType.includes("application/text")) {
      return "yes1"
      return await response.text()
  }
  else if (contentType.includes("text/html")) {
      return "yes2 (indecates an error)"
      return await response.text()
  }
  else {
      return "yes5"
      return await response.text()
  }
}





async function leaveQueue(event){
  const sessionIDDataReceived = event.request.headers.get("sessionID");
  if (!(sessionIDDataReceived.indexOf(':') > -1)){

    return new Response(JSON.stringify({"error": "No Org - sessionID pair sent, sessionID needs to be in a ORG:SESSIONID fashion."}), { 
      headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
          "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",

      }})
  }

  const org = sessionIDDataReceived.split(":")[0]
  const sessionID = sessionIDDataReceived // Due to...reasons...the sessionID sent to the QueueBroker must also include the org:session id pair...

  const init = {
    method: "GET",
    headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",
        
        "qbpass": QUEUE_BROKER_PASS
    },
}

console.log(`http://queuebroker.pacman.ai:8080/leaveQueue/${org}/${sessionID}`)
const response = await fetch(`http://queuebroker.pacman.ai:8080/leaveQueue/${org}/${sessionID}`, init);
const resp = await gatherResponse(response)
console.log(resp)
return new Response(JSON.stringify({'success':resp.success, 'msg': resp.msg}), {
  headers: {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",
    
  }
})

}