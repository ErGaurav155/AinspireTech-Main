# AI Call Assistant Exotel Integration

## Required API env values

```env
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_ACCOUNT_SID=
EXOTEL_SUBDOMAIN=api.exotel.com
EXOTEL_SMS_SENDER=
EXOTEL_WEBHOOK_SECRET=
EXOTEL_CALLER_ID=
EXOTEL_CALL_FLOW_URL=
EXOTEL_DLT_ENTITY_ID=
EXOTEL_DLT_TEMPLATE_ID=
```

`EXOTEL_WEBHOOK_SECRET` is optional, but recommended in production. Add it as a query param in the Exotel webhook URL:

```txt
https://api.yourdomain.com/api/call/webhooks/exotel?secret=YOUR_SECRET&clerkId=USER_CLERK_ID
```

If `clerkId` is not present, the webhook handler tries to find the workspace by the Exotel virtual number saved in Call Dashboard > Number Management.

## Exotel setup

1. Complete Exotel KYC and DLT setup.
2. Add your Exotel virtual number in the dashboard number table.
3. In Exotel, add a Passthru or status callback applet pointing to:

```txt
POST or GET /api/call/webhooks/exotel
```

4. Include either `clerkId` in the webhook URL or ensure `VirtualNumber`/`CallTo` exactly matches the saved number.
5. For SMS alerts, configure `EXOTEL_SMS_SENDER` and DLT template values.

## Implemented endpoints

- `POST /api/call/webhooks/exotel` - public Exotel call webhook.
- `GET /api/call/exotel/config` - protected config readiness check.
- `POST /api/call/exotel/sms` - protected SMS send through Exotel.
- `POST /api/call/exotel/connect-call` - protected Exotel connect call trigger.

Webhook events are normalized from query params or JSON body, saved into the call workspace, converted into leads when caller data exists, and used to trigger enabled email/SMS notifications.
