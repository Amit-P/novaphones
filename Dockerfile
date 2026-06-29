# PocketBase backend for NovaMobiles — deployable to Render.com (Docker runtime).
#
# Render notes:
#   - Add a free 1 GB Disk mounted at /pb/pb_data so the SQLite DB persists
#     across restarts/redeploys.
#   - Set env var PB_ENCRYPTION_KEY to a random 32-char string (encrypts the
#     stored settings). Optional but recommended.
#   - Render injects $PORT; the CMD below binds to it (falls back to 8090 locally).
FROM alpine:latest

RUN apk add --no-cache ca-certificates unzip

# Pin the PocketBase version. 0.39.5 is what the local setup + smoke tests were
# verified against (hook API, view collection, API rules all confirmed working).
ARG PB_VERSION=0.39.5

WORKDIR /pb

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb && rm /tmp/pb.zip

# Bundle the JS hooks (and migrations, if you add any) into the image.
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090

# Shell form so $PORT / $PB_ENCRYPTION_KEY expand at runtime.
CMD /pb/pocketbase serve --http=0.0.0.0:${PORT:-8090} ${PB_ENCRYPTION_KEY:+--encryptionEnv=PB_ENCRYPTION_KEY}
