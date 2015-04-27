var QUEUED_SESSION_UPDATES_DB_NAME = 'shed-offline-session-updates';

function queueFailedRequest(request) {
  console.log('Queueing failed request:', request);

  simpleDB.open(QUEUED_SESSION_UPDATES_DB_NAME).then(function(db) {
    // The request.url is used as the key, with the method as the value.
    // The request URL includes the session id.
    // This means that only the last failed update for a given URL will be queued, which is the
    // behavior we want—if someone DELETEs a session and then PUTs the same session, and both fail,
    // then we want the PUT to be replayed.
    db.set(request.url, request.method);
  });
}

function handleQueueableRequest(request) {
  return fetch(request).then(function(response) {
    if (response.status >= 500) {
      // This will cause the promise to reject, triggering the .catch() function.
      // It will also result in a generic HTTP error being returned to the controlled page.
      return Response.error();
    } else {
      return response;
    }
  }).catch(function() {
    queueFailedRequest(request);
  });
}

shed.router.put('/(.+)api/v1/user/schedule/(.+)', handleQueueableRequest);
shed.router.delete('/(.+)api/v1/user/schedule/(.+)', handleQueueableRequest);