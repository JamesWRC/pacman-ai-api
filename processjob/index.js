const defaultMessage = "Spinning up a fresh runner... This could take a minute.";
const errorMsg = { "error" : "There was an error processing request, might be missing / bad headers."};
const valueTTL = 86400; // (24hrs) Seconds to live
//a
async function getBody(request) {
  const body = await request.text()
  try {

    return JSON.parse(body)
  } catch (err) {
    return "None"
  }
}


function respondWithError(){
  return errorMsg
}

async function createMessage(event){
  try{
    //  Get headers needed.
    const serverID = event.request.headers.get("serverID");
    const sessionID = event.request.headers.get("sessionID");

    const receivedBody = await getBody(event.request)
    // return { "error" : "An Error Orccured: 1109: " + String(receivedBody)}

    // Check headers exists
    if (serverID == null || sessionID == null){
      return respondWithError()
    }

    // Construct the message data JSON body
    // const msgData = {
    //         "serverID": serverID,
    //         "sessionID": sessionID
    // }

    // See if mesage already exists and belongs to the requesting server.
    // ONLY update / add to the messages if the serverID matches
    var storedMSg

    try {
      storedMSg = await QUEUE.get(String(sessionID))
          
      if (storedMSg){
        const parsedResp = JSON.parse(storedMSg)
        // return { "error" : "An Error Orccured: 1198: " + String(JSON.stringify(parsedResp))}
        // Check if serverIDs are the same.`
        if (String(parsedResp.serverID) == String(serverID)){
          
          // Add the sent messgae in the mody to the session KV storage
          parsedResp.data.logMsg = receivedBody.msg;

          // Add message to KV, since the same server is updating the body
          await QUEUE.put(String(sessionID), JSON.stringify(parsedResp), {expirationTtl: valueTTL})
        
        }else{
          // Session doesnt have a server allocated to it yet.

          // Update body with the current servers ID
          parsedResp.serverID = serverID;
          // return { "error" : "An Error Orccured: 1102: " + JSON.stringify(parsedResp.data)}
          // Add the sent messgae in the mody to the session KV storage
          parsedResp.data.logMsg = receivedBody.msg;

          // Add message to KV 
          await QUEUE.put(String(sessionID), JSON.stringify(parsedResp), {expirationTtl: valueTTL})
        
        }
      }
    } catch (err){
        return { "error" : "An Error Orccured: 1101: " + String(err)}
    }

    // If no values have been set (i.e There is no record in the KV)
    // if (!storedMSg){
    //   try{
    //     // Add message to KV 
    //     await PROCCESSJOB.put(String(sessionID), JSON.stringify(msgData), {expirationTtl: valueTTL})
    //     storedMSg = JSON.stringify(msgData)
    //   } catch (err){
    //     return { "error" : "An Error Orccured: 1101"}
    //   }
      
    // }

    return storedMSg

  } catch (err){
    return { "error" : "An Error Orccured: 1102"}
  }
}


async function getMessage(event){
  
  // try{
    //  Get headers needed.
    const serverID = event.request.headers.get("serverID");
    const sessionID = event.request.headers.get("sessionID");

    // Check headers exists
    if (serverID == null || sessionID == null){
      return respondWithError()
    }

    const resp = await QUEUE.getWithMetadata(String(sessionID))

    return resp.value
  // } catch (err){
  //   return { "error" : "There was an error processing, might be missing / bad headers."};
  // }
}

async function processRequest(event){
    // Get headers and handle params.
  var response;
    if (event.request.method === 'POST') {
      response = await createMessage(event)
    }else if (event.request.method === 'GET' ) {
      response = await getMessage(event)
    }
    
    return new Response(response, {
        headers: {
            "content-type": "application/json",
            "Access-Control-Allow-Origin":"*",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, contenttype"
          
        }
    })
}
addEventListener("fetch", event => {
  return event.respondWith(processRequest(event));
})


