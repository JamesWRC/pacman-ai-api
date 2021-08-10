const DEFAULT_ORG = "DEFAULT";
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

    if(queuebrokerRequest.status !== 200 && queuebrokerRequest.status !== 401){

      return await getJobsFromKV(event);

    }

    var queuebrokerRequestCloneBody = await queuebrokerRequest.json()

    

    var response = new Response(JSON.stringify(queuebrokerRequestCloneBody), queuebrokerRequest)
    response.headers.set("requestMode", "queueBroker")

    return response;
    
  }



  return new Response(JSON.stringify(value.keys))
}

async function generateGitJWT(sessionID){
  var pacmManPrivateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCu+bfTspK9hVsA\n7s6gM+2R1OJiNQieg1kwL/44gvqg6iq6CXnGACI1njF08w4cR58U04SShj1fYUe8\nq5pmsR5wY27hnwwb4XAAk33Omuzf/mnMzP1xVgy5/Iukv3FDe8Rdm1OXPv3nGQ2D\nADbpGtwY03/qxBw14Cb6Vc8uG2xLIQInWk2sC+cVgosMjOWSo5F6z5tj/GrCl48H\nLIJMhIC4ozgsWOPvS3Du4Ziwgm2kiTDcq6KrYy56K9aVRSkqyKVms0JTbDiopaca\n4RGkAi5o1UPfxh8BTYK0CGFuFxR0d/GhbnWPIUBbyBzKnEDHWaeq/LIw9Q2ddac1\nce5WbvlTAgMBAAECggEAGLGTWOQNw4NreXE6Ze+OKpORs2xqn/xHfP548T7C4izK\nBOFLdz8TlN+TeT7IEgOllsnXHtqlFK3k8uKA8tcyRYgy4NKSYejp5prqGVtR7La5\n9bZEWldbim/ywThnYq+34cIHBQRVzuSBPKiuFy28PCC1H8u3c38D4TZ0+7vRB7UP\n74B3WTtohmnFs0UvhnS2WWO0Xl/e/lXi4cve+CmaRVm1IAAZxYTkKUEvxCwQFNYE\nQhNntNl/rCohg1LqSAyiAkXt2s4qvfr0CD1DLcHXlm9fmy1qIE6Xlt1LOCFIpBbg\nxqAE9pMcz4AHs2236n1E68jfRzqBPpiu/0z37ILysQKBgQDkj0Lp7MlmwswfjF70\naiJE4JsiiO0wpfp9MdvuYWwSnGmDIgVB7QSPx1fGLYCnKQxSxsLYuAW9GVyCBIW2\nyl03JjORu5yEQIIZbGIxXIPu7ormX7yh0d04FHMuqvmYykzBHuu+AktGv92MQ6nB\nlERDtk94D6S/jbiYJ02+12WzqwKBgQDD+46wV6M3nb3AauznHuvzVfm+oaW0qs1c\n6BZ1hrd8x//00fBiKivRkTvLqkmmWalmX27l5igXdaEy7Fo1ijeA/jXIw4sEzyrV\nJIJhNLn4Dx6o04PuV+mjPOJH88m711qGFAz7u+Mx3OHsWi3iwQO/bqmLR/yehUOd\ntibdONGo+QKBgAW7wkXz9qlpQY2ZC9i9wNZRfBLFtI1/3GS/l3DHaNqeqdbsR417\n0J16tqz1/0AyO2joK4McOqiftj5ctq37LZNwleKV/jsjEyBoI55xX63itgFJbYXx\nqcb6XFlTWKeIi5xcljVSAWlo7rnSCLQecAfyztOIMO3NNFA8zCp5ZMe5AoGAUSpv\nz+ybtj7oBTbDYnzV73Nd+Wts+0P5xU6Bbq8act1JzhTcX2tjtmlVwGWIFxLvK2y+\nuwv08rJOzo5AVggmMJAXqkwB2T4LWTbDoIp7spZgdj8TVrSmGGrwtCftFpR78yd+\nsQsBbvcxwfcfJdgWO0QTh5GKuAQtGrYDpn8PpdECgYEAq8B9Ag2OKcwbLmmSGWbi\nIqymYNg/3vi9eU9IqfWsYSLXBfF4xg4wNupUD7gx+do++mAdXQ9fzBk434HDhcL+\n5QMNHEP3w3XCjX+fX9fZ7pvO3EBYJ97oFUghrd3PuDUHbDrjvh1MjGbyjogomqNc\nFk6CVTqt4xyqf2xB7QEsEhw=\n-----END PRIVATE KEY-----\n"
  console.log(test)
  const auth = createAppAuth({
    appId: PACMAN_AI_GIT_APP_ID,
    privateKey: pacmManPrivateKey,
    clientId: PACMAN_AI_GIT_APP_CLIENT_ID,
    clientSecret: PACMAN_AI_GIT_APP_CLIENT_SECRET,
  });

  const appAuthentication = await auth({ type: "app" });

  return appAuthentication;
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
  if(serverID === "NONE"){
    return new Response(JSON.stringify({'error': 'No auth header.'}),
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

