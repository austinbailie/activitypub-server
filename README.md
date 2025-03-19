# ActivityPub Server

A simple ActivityPub server implementation that serves actor files with the correct content types for Mastodon integration.

## Features

- Serves actor files with `application/activity+json` content type
- Serves webfinger endpoints with `application/jrd+json` content type
- Docker support for easy deployment
- Health check endpoint
- CORS enabled
- Security headers with helmet

## Setup

1. Clone the repository:
```bash
git clone https://github.com/austinbailie/activitypub-server.git
cd activitypub-server
```

2. Build and start the Docker container:
```bash
docker-compose up --build
```

The server will be available at `http://localhost:3000`.

## Endpoints

- `/actors/earlyadopter.json` - Actor file (application/activity+json)
- `/.well-known/webfinger` - Webfinger endpoint (application/jrd+json)
- `/health` - Health check endpoint

## Development

To run the server in development mode with hot reloading:

```bash
npm install
npm run dev
```

## Docker

Build the image:
```bash
docker build -t activitypub-server .
```

Run the container:
```bash
docker run -p 3000:3000 activitypub-server
```

## License

MIT 