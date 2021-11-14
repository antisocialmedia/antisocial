# antisocial server
the antisocial server provides the backbone for the antisocial platform, providing services like storing identity/handshake keys and sessions, authenticating clients, and forwarding messages between clients.

**SSL IS NOT YET SUPPORTED AS ANTISOCIAL IS STILL IN PROTOTYPING. DO NOT USE IT YET.**

## installation
* run `npm i`.
* make a `config.json`. a bare minimum is provided below for testing purposes:
```JSON
{
  "port": 8080,
  "webSocketPort": 2672
}
```
* you're done! congrats.