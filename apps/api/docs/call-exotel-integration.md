# AI Call Assistant Exotel Integration

## Required API env values

```env
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_ACCOUNT_SID=
EXOTEL_SUBDOMAIN=api.exotel.com
EXOTEL_SMS_SENDER=
EXOTEL_WEBHOOK_SECRET=
EXOTEL_WEBHOOK_URL=
PUBLIC_API_URL=
EXOTEL_PAID_NUMBER_POOL_NUMBERS=
EXOTEL_CALLER_ID=
EXOTEL_CALL_FLOW_URL=
EXOTEL_VOICEBOT_WS_URL=
EXOTEL_VOICEBOT_PATH=/api/call/voicebot-stream
EXOTEL_VOICEBOT_SAMPLE_RATE=24000
EXOTEL_VOICEBOT_SECRET=
OPENAI_API_KEY=
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
CALL_VOICEBOT_SILENCE_TIMEOUT_SEC=20
CALL_VOICEBOT_MAX_DURATION_SEC=300
CALL_VOICEBOT_SPEECH_RMS_THRESHOLD=450
EXOTEL_DLT_ENTITY_ID=
EXOTEL_DLT_TEMPLATE_ID=
```

`EXOTEL_WEBHOOK_SECRET` is optional, but recommended in production. Add it as a query param in the Exotel webhook URL:

```txt
https://api.yourdomain.com/api/call/webhooks/exotel?secret=YOUR_SECRET
```

For production missed-call routing, do not include `clerkId` for every customer.
Instead, assign one Exotel number per workspace and let the webhook handler find
the workspace from `VirtualNumber`, `CallTo`, or `To`.

`clerkId`, `userId`, or `ownerId` can still be used as a fallback/debug query
param for a manually routed Exotel flow.

Use either:

```txt
EXOTEL_WEBHOOK_URL=https://api.yourdomain.com/api/call/webhooks/exotel?secret=YOUR_SECRET
```

or:

```txt
PUBLIC_API_URL=https://api.yourdomain.com
EXOTEL_WEBHOOK_SECRET=YOUR_SECRET
```

The dashboard masks secret values in displayed URLs.

`EXOTEL_PAID_NUMBER_POOL_NUMBERS` is a comma-separated list of dedicated
Exotel DIDs that can be assigned to paid call assistant workspaces:

```txt
EXOTEL_PAID_NUMBER_POOL_NUMBERS=080XXXXXXX,+9180YYYYYYY
```

`EXOTEL_VOICEBOT_WS_URL` is optional. Set it when your Exotel Voicebot /
bidirectional-streaming applet should connect to your realtime AI voice server.
If it is not set, the API derives it from `PUBLIC_API_URL`,
`EXOTEL_VOICEBOT_PATH`, `EXOTEL_WEBHOOK_SECRET`, and
`EXOTEL_VOICEBOT_SAMPLE_RATE`.

For production, use a WSS URL like:

```txt
wss://api.yourdomain.com/api/call/voicebot-stream?secret=YOUR_SECRET&sample-rate=24000
```

`OPENAI_API_KEY` is required for live AI conversation. The voice bridge uses the
OpenAI Realtime API, streams Exotel audio to the model, streams the model's PCM
audio back to Exotel, saves the call transcript/summary, and sends the owner
email/WhatsApp alert through the existing appointment notification sender.

The defaults enforce:

- Caller silence / mute timeout: 20 seconds.
- Maximum voicebot call duration: 300 seconds / 5 minutes.
- Realtime voice: `marin`.
- Realtime model: `gpt-realtime`.

## Exotel setup

1. Complete Exotel KYC and DLT setup.
2. Add available Exotel virtual numbers to `EXOTEL_PAID_NUMBER_POOL_NUMBERS`.
3. Create the call assistant from the dashboard. The API assigns one Exotel DID
   to the workspace and shows call-forwarding codes.
4. In Exotel, add a Voicebot applet for each assigned Exotel number. Use the
   generated voicebot WSS URL:

```txt
wss://api.yourdomain.com/api/call/voicebot-stream?secret=YOUR_SECRET&sample-rate=24000
```

5. Enable recording in the Voicebot applet if your Exotel account supports it.
   Exotel can make the recording URL available to the next Passthru applet.
6. Add a Passthru/status callback after the Voicebot applet pointing to:

```txt
POST or GET /api/call/webhooks/exotel
```

7. Configure the customer's business phone to forward busy/no-answer/unreachable
   calls to the assigned Exotel number shown in the dashboard.
8. For SMS alerts, configure `EXOTEL_SMS_SENDER` and DLT template values.
9. If Exotel sends a recording URL as `RecordingUrl`, `RecordingURL`,
   `Recording`, `CallRecordings`, or `recording_url`, it is saved on the call row
   and shown as an audio player in the owner dashboard.

## Implemented endpoints

- `POST /api/call/webhooks/exotel` - public Exotel call webhook.
- `WSS /api/call/voicebot-stream` - Exotel Voicebot bidirectional audio stream.
- `GET /api/call/exotel/config` - protected config readiness check.
- `POST /api/call/exotel/sms` - protected SMS send through Exotel.
- `POST /api/call/exotel/connect-call` - protected Exotel connect call trigger.

Webhook and voicebot events are normalized, saved into the call workspace, converted into leads when caller data exists, and used to trigger enabled email/WhatsApp notifications.
