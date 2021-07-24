const DEFAULT_ORG = "DEFAULT";
const { createAppAuth } = require("@octokit/auth-app"); 
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})
/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(event) {
  if(event.request.headers.get("requestMode") === "generate"){
    return await getJobsFromKV(event);
  }else{
    const queuebrokerRequest = await getJobFromQueueBrokerServer(event);

    if(queuebrokerRequest.status !== 200){

      return await getJobsFromKV(event);

    }

    var response = new Response(queuebrokerRequest.body, queuebrokerRequest)
    response.headers.set("requestMode", "queueBroker")

    return response;
    
  }



  return new Response(JSON.stringify(value.keys))
}

async function getJobsFromKV(event){

  var value;
  if(!event.request.headers.get("orgNamePrefix")){
    value = await QUEUE.list({"prefix": DEFAULT_ORG + ":"})
  }else{
    const orgNamePrefix = event.request.headers.get("orgNamePrefix")
    value = await QUEUE.list({"prefix": orgNamePrefix + ":"})
  }

  return new Response(JSON.stringify(value),{
    headers: {
        "content-type": "application/json;charset=UTF-8",
        "requestMode": "batch",
    },
  })

}

async function getJobFromQueueBrokerServer(event){
  var serverID = 'UNKNOWN' + String(Math.floor((Math.random() * 9999999) + 1));
  if(event.request.headers.get("serverID") ){
    serverID = event.request.headers.get("serverID") || 'NONE'
  }
  const init = {
    headers: {
        "content-type": "application/json;charset=UTF-8",
        "qbpass": QUEUE_BROKER_PASS,
        "serverID": serverID
    },
  }
  var baseUrl = "http://queuebroker.pacman.ai:8080/getjob/";
  var url = "";
  if(!event.request.headers.get("orgNamePrefix")){
    url = baseUrl + DEFAULT_ORG
  }else{
    const orgNamePrefix = event.request.headers.get("orgNamePrefix")
    url = baseUrl + orgNamePrefix
  }
  console.log(url)

  return response = await fetch(new URL(url), init);
}

