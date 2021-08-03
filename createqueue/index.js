const valueTTL = 86400; // (24hrs) Seconds to live

const maxTeamTTL = 7776000; // (about 3 months) 
const generatedTeamPasswordMaxLength = 8; // Number of chars in the password

const defaultOrganization = "DEFAULT";
//Access-Control-Allow-Origin
function hCAPTCHAError() {
    // User has not specified the 'userKey' header. 
    var error = JSON.stringify({ "error": "hCAPTCHA failed" })

    return new Response(error,
        {
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
                "Access-Control-Max-Age": "86400",
                "Access-Control-Allow-Headers": "access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID"
            },
            statusText: "hCAPTCHA failed",
            status: 401
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

async function getName(event) {

    const response = await fetch("https://names.pacman.workers.dev/");
    const results = await gatherResponse(response);
    return results;
}

async function getOrgNames(event) {

    const response = await fetch("https://compileorgslist.pacman.workers.dev/");
    const results = await gatherResponse(response);
    return results;
}


function checkBase64(string) {
    // Will check if the reponse recieved is valid base64.
    try {
        var regex = new RegExp(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
        if (btoa(atob(string)) && regex.test(string)) {
            return true
        } else {
            return false
        }
    } catch (err) {
        return false
    }
}

async function addToQueueKV(sessionID, queueData, metaData) {

    await QUEUE.put(String(sessionID), String(queueData), { expirationTtl: valueTTL, metadata: metaData });
}

async function getBody(request) {
    const body = await request.text()
    const ip = request.headers.get("CF-Connecting-IP")
    try {
        var aa = JSON.parse(body)
        return aa
    } catch (err) {
        return "None"
    }
}

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

async function checkteam(event, gameSettings) {
    const teamName = encodeURIComponent(gameSettings.teamName)
    const team = await TEAMS.get(teamName);
    var parsedTeamData;
    if (team) {
        parsedTeamData = JSON.parse(team)
    }

    // Check if team exists
    if (team) {

        // Check if team passwors matched user supplied password
        if (parsedTeamData.password === gameSettings.teamPassword) {

            // Return true since the user has supplied appropriate data to authenticate 
            // that the user is allowed to run a game under the team name.
            return { "success": true, "teamCreated": false }
        } else {
            // Return false as the password does not match.
            return { "success": false, "data": "password is incorrect."}
        }
    } else {
        return { "success": false, "data": "There was some kind of error with fetching team."}
    }
}

async function hCAPTCHAVerification(gameSettings) {
    try {
        if (!gameSettings.hCAPTCHAUserKey) {
            return { "success": false, "error": "No hCAPTCHA token received." };
        }

    } catch (err) {
        return { "success": false, "error": "No hCAPTCHA token received." };
    }


    const init = {
        method: "POST",
        headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-Control-Allow-Origin",
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: "response=" + gameSettings.hCAPTCHAUserKey + "&secret=" + H_CAPTCHA_KEY
    }

    const response = await fetch("https://hcaptcha.com/siteverify", init);
    // Check if the request is successful and the success =  true

    const resp = await gatherResponse(response)
    if (!resp.success) {
        // Return error 
        return { "success": false, "error": "No hCAPTCHA token received." };

    }
    return { "success": true };

}

async function processRequest(event) {

    // Check and process team


    // Get headers and handle params.
    const serverID = event.request.headers.get("serverID");
    var gameSettings = await getBody(event.request);

    // Verify hCAPTCHA user token
    // const captcha = await hCAPTCHAVerification(gameSettings);
    // if(!captcha.success){
    //     return hCAPTCHAError();
    // }


    var sessionID = await generateSession();

    //######################################### QUEUE DATA ##############################################

    // var content = event.request.headers.get("gameData");
    var useDefaults = false;
    var gameType = "normal";

    if (gameSettings == "None") {
        useDefaults = true;
        gameType = "demo";
    }

    // check team names are handled and sed properly.
    if (!gameSettings.teamName) {
        return new Response(JSON.stringify({ "succes": false,  "msg": "Team name must be specified" }), {
            headers: {
                "access-Control-Allow-Origin": "*",
                "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                "content-type": "application/json;charset=UTF-8",
            }
        })
    } 

    // Check organization is handeled aand set properly. 
    if (!gameSettings.organization) {
        gameSettings.organization = defaultOrganization;
    } else {
        // Ensure string is uppercased
        gameSettings.organization = gameSettings.organization.toUpperCase()
        const nameList = await getOrgNames();

        // If the org name supplied by the user is not in the org list, then set it to the default.
        if (!nameList.names.includes(gameSettings.organization)) {
            gameSettings.organization = defaultOrganization;
        }

    }


    // Check teams 
    const teamData = await checkteam(event, gameSettings);

    if (!teamData.success) {
        return new Response(JSON.stringify({ "succes": false, 'debug': teamData.data, "msg": "Team name or password is incorrect." }), {
            headers: {
                "access-Control-Allow-Origin": "*",
                "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                "content-type": "application/json;charset=UTF-8",
            }
        })
    }

    // Check if values are base64 encoded and valid
    if (gameSettings.agentCode && (!checkBase64(gameSettings.agentCode) || !checkBase64(gameSettings.agentRequirements))) {
        return new Response(JSON.stringify("bad base64 data recieved!", null, 4), {
            headers: {
                "access-Control-Allow-Origin": "*",
                "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                "content-type": "application/json;charset=UTF-8",
            }
        })
    }

  // Check the signup request has the minimum criteria
  if(!gameSettings['redTeam'] || !gameSettings['blueTeam']){
    console.log('not enough stuff in body')
    return new Response(JSON.stringify({ "success": false, "errorCode": 777, "msg": "Failed to create game, missing the minimum criteria."}), {
      headers: {
        "access-Control-Allow-Origin": "*",
        "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
        "content-type": "application/json;charset=UTF-8",
      }
    })
  }



    // Get data from queue system. (Yet to be implemented, this whole QUEUE DATA will be in a loop.)

    var redTeam = "";
    var blueTeam = "";
    var randomSeed = true;
    var mapNumber = Math.ceil(Math.random() * 99999);
    var numberOfGames = Math.ceil(Math.random() * 5);
    var agentCode = "";
    var agentRequirements = "";
    var organization = "";

    if (useDefaults) {
        organization = "DEFAULT"
        redTeam = "baselineTeam";
        blueTeam = "pacman_dot_ai_team";
        randomSeed = true;
        mapNumber = Math.ceil(Math.random() * 99999);
        numberOfGames = Math.ceil(Math.random() * 5);
        agentCode = "cmVxdWVzdHMK"
        agentRequirements = "cmVxdWVzdHMK"
    } else {
        organization = gameSettings.organization;
        redTeam = gameSettings.redTeam; // User team.
        blueTeam = gameSettings.blueTeam; // Opponant teams.
        randomSeed = gameSettings.randomSeed;
        mapNumber = gameSettings.map;
        numberOfGames = parseInt(gameSettings.numberOfGames);
        agentCode = gameSettings.agentCode;
        agentRequirements = gameSettings.agentRequirements
    }


    // Data checking
    if (!mapNumber) {
        mapNumber = Math.ceil(Math.random() * 9999999)
    }

    if (!numberOfGames) {
        numberOfGames = 1
    }





    //#######################################
    //############## GAME DATA ##############
    //########################################

    var gameData = {
        "redTeam": redTeam,
        "blueTeam": blueTeam,
        "randomSeed": randomSeed,
        "map": mapNumber,
        "numberOfGames": numberOfGames
    }

    // Construct the main data JSON body
    const data = {
        "runnerStatus": 0,
        "organization": organization,
        "gameType": gameType,
        "useTimeConstraints": true,
        "logMsg": ["Finding you an available runner in the server pool. This may take some time, depending on current demand. Please be patient and don't refresh the page - we will let you know the moment your game has been allocated!"],
        "gameResults": [],
        "runningScore": 0,
        "gameData": [gameData]
    }



    // Construct the main runner data JSON body
    const runnerData = {
        "serverID": serverID,
        "sessionID": sessionID,
        "completed": false,
        "data": data,
        "agentCode": agentCode,
        "agentRequirements": agentRequirements,
        "replayFile": "",
        "errors": []
    }
    // NOTE: code in json is used to better controll user experience
    // and do certain actions based on the code. 
    //##################################################################################################



    // Return fully contructed json body 
    const json = JSON.stringify(runnerData, null, 4);


    // Try and add the data to the queue and catch any issues.
    const metaData = {
        "teamName": redTeam,
        "opponentTeam": blueTeam,
        "gameStartTime": 0,
        "gameEndTime": 0,
        "gameQueuedTime": Date.now(),
        "gameType": runnerData.data.gameType,
        "completed": runnerData.completed
    }


    //Apply prefix of org sessionID
    sessionID = organization + ":" + sessionID

    // Adds job the the queue broker service (main queueing service that runners use.)
    const queueBrokerData = await notifyQueueBroker(event, sessionID, organization, metaData)

    // Add job to the Queue.
    await addToQueueKV(sessionID, json, metaData);

    // Add data to message broker
    const messageBrokerMsg = await sendMsgUsingMessageBrokerService(event, json, sessionID);

    // Return the gameData..
    var jsonResponse;
    if (teamData.teamCreated) {
        jsonResponse = JSON.stringify({ "teamInfo": teamData, "sessionID": sessionID, "queueData": queueBrokerData, "data": JSON.parse(json) })
    } else {
        jsonResponse = JSON.stringify({ "sessionID": sessionID, "queueData": queueBrokerData, "data": JSON.parse(json) })
    }
    return new Response(jsonResponse, {
        headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            "content-type": "application/json;charset=UTF-8",
        }
    })
}


async function notifyQueueBroker(event, sessionID, organization, metaData) {
    const init = {
        method: "POST",
        headers: {
            "access-Control-Allow-Origin": "*",
            "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
            "content-type": "application/json;charset=UTF-8",
            "metaData": JSON.stringify(metaData),
            "qbpass": QUEUE_BROKER_PASS
        },
    }
    const response = await fetch("http://queuebroker.pacman.ai:8080/addjob/" + organization + "/" + sessionID, init);
    const resp = await gatherResponse(response)
    return resp

}

async function sendMsgUsingMessageBrokerService(event, jsonData, sessionID){
  
  
    const init = {
      body: JSON.stringify(jsonData),
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
    url = baseUrl + sessionID
    console.log(url)
  
    return response = await fetch(new URL(url), init);
  }

addEventListener("fetch", event => {
    if (event.request.method === 'POST') {
        try {
            return event.respondWith(processRequest(event));
        } catch (err) {
            return event.respondWith(new Response(String(err), {
                headers: {
                    "access-Control-Allow-Origin": "*",
                    
                    "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                    // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                    "content-type": "application/json;charset=UTF-8",
                }
            }))
        }
    } else {
        return event.respondWith(new Response("OK", {
            headers: {
                "access-Control-Allow-Origin": "*",
                "access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                // "access-Control-Request-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype, access-control-allow-origin",
                "content-type": "application/json;charset=UTF-8",
            }
        }))
    }

})