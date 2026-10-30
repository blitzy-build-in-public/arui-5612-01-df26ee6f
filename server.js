const http = require('node:http');

const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;
const CONTENT_TYPE_TEXT_PLAIN = 'text/plain';
const HELLO_BODY = 'Hello world';
const NOT_FOUND_BODY = 'Not Found';
const SHUTDOWN_TIMEOUT_MS = 1000;

let server = null;
let resolvedPort = null;
const openSockets = new Set();
let shuttingDown = false;

function resolvePort() {
  const configuredPort = process.env.PORT;
  const value = configuredPort === undefined ? '' : configuredPort.trim();

  if (value === '') {
    return DEFAULT_PORT;
  }

  const port = /^\d+$/.test(value) ? Number(value) : NaN;

  if (Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT) {
    return port;
  }

  console.error('Configuration error: PORT must be an integer between ' + MIN_PORT + ' and ' + MAX_PORT + ' (received "' + configuredPort + '").');
  console.error('Start the server with a valid port, for example: PORT=8080 npm start');
  return null;
}

function getPathname(requestUrl) {
  const queryStart = requestUrl.indexOf('?');

  if (queryStart === -1) {
    return requestUrl;
  }

  return requestUrl.slice(0, queryStart);
}

function logRequest(method, requestUrl) {
  console.log(new Date().toISOString() + ' ' + method + ' ' + requestUrl);
}

function sendTextResponse(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', CONTENT_TYPE_TEXT_PLAIN);
  response.end(body);
}

function handleHelloRequest(response) {
  sendTextResponse(response, 200, HELLO_BODY);
}

const ROUTES = Object.freeze({
  '/hello': { method: 'GET', handle: handleHelloRequest },
});

function handleRequest(request, response) {
  logRequest(request.method, request.url);

  response.on('error', handleStreamError);

  const pathname = getPathname(request.url);
  const route = ROUTES[pathname];

  if (route !== undefined && route.method === request.method) {
    route.handle(response);
    return;
  }

  // An unmatched path and a method the matched route does not answer both fall through to the same
  // 404: there is no separate method check, so a wrong-method request is "not found" rather than
  // "method not allowed".
  sendTextResponse(response, 404, NOT_FOUND_BODY);
}

function handleStreamError(error) {
  console.error('Request handling error: ' + error.message);
}

function handleServerError(error) {
  if (error.code === 'EADDRINUSE') {
    console.error('Failed to start server: port ' + resolvedPort + ' is already in use (EADDRINUSE).');
    console.error('Stop the process using it, or start on another port, for example: PORT=8080 npm start');
  } else {
    console.error('Failed to start server: ' + error.message);
  }

  process.exitCode = 1;
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log('Shutting down server (' + signal + ')...');

  server.close((error) => {
    if (error === undefined) {
      console.log('Server closed.');
      process.exitCode = 0;
    }
  });

  for (const socket of openSockets) {
    socket.end();
  }

  // Failsafe: a peer that never finishes its half of the connection must not be able to hold the
  // process open, so whatever is still tracked is destroyed once the timeout elapses. The timer is
  // unref'd because it must never keep the process alive on its own.
  const failsafe = setTimeout(() => {
    for (const socket of openSockets) {
      socket.destroy();
    }

    process.exitCode = 0;
  }, SHUTDOWN_TIMEOUT_MS);

  failsafe.unref();
}

resolvedPort = resolvePort();
server = http.createServer(handleRequest);

// Sockets are tracked here so shutdown can end them: server.close() leaves an idle keep-alive
// connection open, and the built-in helpers that would close such connections post-date the Node
// 18.0.0 floor this project targets.
server.on('connection', (socket) => {
  openSockets.add(socket);
  socket.on('close', () => {
    openSockets.delete(socket);
  });
});

server.on('error', handleServerError);
process.on('SIGINT', () => shutdown('SIGINT'));

if (resolvedPort === null) {
  process.exitCode = 1;
} else {
  server.listen(resolvedPort, () => {
    console.log('Server listening on port ' + resolvedPort);
  });
}
