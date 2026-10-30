# nodejs-tutorial-hello-world

Minimal Node.js HTTP server tutorial demonstrating single endpoint implementation

## Purpose

This is a minimal single-file Node.js HTTP server built on the built-in `http` module alone, with
zero external dependencies. It answers exactly one route, and every other request falls through to
the catch-all 404.

| Request | Status | `Content-Type` | Body |
|---------|--------|----------------|------|
| `GET /hello` | `200 OK` | `text/plain` | `Hello world` |
| Every other request | `404 Not Found` | `text/plain` | `Not Found` |

It exists to be read as a teaching example. Creating the server, inspecting the request, matching the
route, writing the response, logging every request, validating the port and shutting down cleanly all
happen in one file, with no framework between the reader and the Node.js API.

## Prerequisites

- **Node.js v18.0.0 or newer.** Check the version you have:

```
node --version
```

- Nothing else. There is no database, no service and no other software to install.

## Installation

None. The project depends on nothing outside Node.js built-in modules, so there are no packages to
install, no build step, no `npm install`, no lockfile and no `node_modules` directory. Clone or
download the repository and run the server.

## Running the server

From the repository root:

```
node server.js
```

The same server can be started through npm:

```
npm start
```

`npm start` runs the manifest's `start` script, which is `node server.js`, so both commands start
exactly the same server.

The server listens on port 3000 by default and prints one confirmation line:

```
Server listening on port 3000
```

It then runs in the foreground, printing one line for every request it receives, until you stop it
(see [Stopping the server](#stopping-the-server)). To listen on a different port, see
[Configuration](#configuration).

## Testing the endpoint

With the server running, request the `/hello` route from a second terminal:

```
curl http://localhost:3000/hello
```

The response body is:

```
Hello world
```

Add `-i` to see the status line and the response headers as well:

```
curl -i http://localhost:3000/hello
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 30 Oct 2026 06:57:13 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 11

Hello world
```

`Content-Type` is exactly `text/plain`, with no charset parameter, and the status is `200 OK`.
`Content-Length` is 11 because the body is 11 bytes.

Everything else falls through to the catch-all 404. An unknown path:

```
curl -i http://localhost:3000/invalid
```

```
HTTP/1.1 404 Not Found
Content-Type: text/plain
Date: Fri, 30 Oct 2026 06:57:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 9

Not Found
```

`/hello` answers `GET` only, so any other method on that path is a 404 — not a 200, and not a 405:

```
curl -i -X POST http://localhost:3000/hello
```

```
HTTP/1.1 404 Not Found
Content-Type: text/plain
Date: Fri, 30 Oct 2026 06:57:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 9

Not Found
```

A `HEAD` request on the same path behaves the same way, with no body, because Node.js suppresses the
body of a HEAD response:

```
curl -I http://localhost:3000/hello
```

```
HTTP/1.1 404 Not Found
Content-Type: text/plain
Date: Fri, 30 Oct 2026 06:57:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

Matching uses the path portion of the URL only, and compares it exactly and case-sensitively: the
query string is ignored, while a trailing slash or a different letter case is not matched:

```
curl -i 'http://localhost:3000/hello?x=1'
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Fri, 30 Oct 2026 06:57:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 11

Hello world
```

```
curl -i http://localhost:3000/hello/
```

```
HTTP/1.1 404 Not Found
Content-Type: text/plain
Date: Fri, 30 Oct 2026 06:57:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 9

Not Found
```

## Expected output

These are the exact outputs the server produces: the console lines it prints and the response
bodies it returns over HTTP.

Startup, printed once after the port is bound:

```
Server listening on port 3000
```

One line per request, printed before the route runs. The line is the UTC timestamp in ISO-8601 form,
then the HTTP method, then the raw request URL as it arrived — query string included and unmodified:

```
2026-10-30T06:57:13.994Z GET /hello
```

The response body for `GET /hello`:

```
Hello world
```

The response body for every other request:

```
Not Found
```

Responses carry the header `Content-Type: text/plain` and one of the two status codes above: `200`
for `GET /hello`, `404` for everything else.

A short session in full — two requests, then Ctrl+C — looks like this:

```
Server listening on port 3000
2026-10-30T06:57:13.994Z GET /hello
2026-10-30T06:57:14.002Z GET /invalid
Shutting down server (SIGINT)...
Server closed.
```

## Stopping the server

Press **Ctrl+C** in the terminal that is running the server. That sends `SIGINT`, and the console
prints:

```
Shutting down server (SIGINT)...
Server closed.
```

The server stops accepting new connections, closes the open ones, and the process exits with status
`0`. It does not hang, even when a browser or another keep-alive client is still connected.

## Configuration

`PORT` is the only configuration channel. The server reads it once at startup and reads no
configuration file.

| `PORT` | Result |
|--------|--------|
| unset, or blank | listens on `3000`, the default |
| `1024` to `65535` | listens on that port |
| anything else | prints the configuration error and exits with status `1`, binding nothing |

The accepted range starts at 1024 because the ports below it are privileged.

To listen on a different port, start the server with `PORT` set:

```
PORT=8080 npm start
```

which is the same as:

```
PORT=8080 node server.js
```

Either one prints the port it bound:

```
Server listening on port 8080
```

and the endpoint then answers on that port:

```
curl http://localhost:8080/hello
```

A value outside the range, or anything that is not an integer, is refused before a port is bound. For
example, `PORT=80 node server.js` writes this to standard error:

```
Configuration error: PORT must be an integer between 1024 and 65535 (received "80").
Start the server with a valid port, for example: PORT=8080 npm start
```

and exits with status `1`. The same happens for a non-integer (`PORT=abc`), a negative number
(`PORT=-1`) or a value above the range (`PORT=70000`).

If the port is already in use by another process, the server reports that too and exits with status
`1`:

```
Failed to start server: port 3000 is already in use (EADDRINUSE).
Stop the process using it, or start on another port, for example: PORT=8080 npm start
```
