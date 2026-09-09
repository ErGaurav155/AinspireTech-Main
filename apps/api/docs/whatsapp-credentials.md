# WhatsApp credential ownership

RocketReplai uses two independent WhatsApp credential paths.

## Customer automation replies

- Embedded Signup returns a temporary OAuth credential used to resolve and
  validate the WABA and phone number selected by that customer.
- The API assigns RocketReplai's System User to that exact WABA with the
  `MANAGE` task, verifies sender access, and subscribes the app before marking
  the workspace connected.
- The temporary customer's OAuth token is not stored. Read receipts, typing
  indicators, AI replies, menus, appointment chat, customer confirmations,
  and follow-ups use `WHATSAPP_SYSTEM_USER_ACCESS_TOKEN` only after assignment
  to that workspace's WABA.
- If Meta rejects the System User or its WABA assignment, the workspace is
  marked disconnected and the owner must complete Embedded Signup again.

Configure `WHATSAPP_SYSTEM_USER_ACCESS_TOKEN` on the API service. The token
must belong to an Admin System User in RocketReplai's Business Portfolio and
include `business_management`, `whatsapp_business_management`, and
`whatsapp_business_messaging`.
`WHATSAPP_SYSTEM_USER_ID` is optional because the API reads it from token debug
data, but it can be configured explicitly if Meta does not return `user_id`.

## RocketReplai appointment-owner alerts

Appointment alerts to a business owner's notification number are sent from the
RocketReplai provider phone number using the provider-owned approved template.
Configure these API-service variables:

- `APPOINTMENT_ALERT_WHATSAPP_PHONE_NUMBER_ID`
- `APPOINTMENT_ALERT_WHATSAPP_WABA_ID`
- `APPOINTMENT_ALERT_WHATSAPP_ACCESS_TOKEN`
- `APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_NAME`
- `APPOINTMENT_ALERT_WHATSAPP_TEMPLATE_LANGUAGE`

Legacy `ROCKETREPLAI_WHATSAPP_*`, `WHATSAPP_PROVIDER_*`, and
`WHATSAPP_SYSTEM_USER_ACCESS_TOKEN` fallbacks remain supported only on this
provider notification path.

## Customer-service window

Normal automation sends happen in direct response to an inbound customer
message. Scheduled follow-ups stop at 23 hours after the customer's last
message so they do not cross the 24-hour customer-service window. Outside that
window, only an appropriately approved template may be sent.

## Shared business knowledge

Business knowledge is owned by `SharedBusinessKnowledge`, keyed by Clerk user
ID. It is not stored in `WhatsAppWorkspace`.

When the owner saves a website, typed business information, or a supported
plain-text file, the API:

1. Discovers and scrapes up to 10 same-domain pages through link level 3 when
   the website has enough accessible pages.
2. Cleans and AI-normalizes each changed source independently.
3. Merges every available normalized source and removes semantic duplicates.
4. Uploads one compact plain-text artifact to Cloudinary.
5. Stores only short source metadata and the Cloudinary asset reference in
   `SharedBusinessKnowledge`; long business text is never stored in MongoDB.

WhatsApp, Instagram AI DMs, and the website chatbot load that same artifact for
customer replies. The plain-text Cloudinary artifact includes the compact
runtime knowledge and an internal normalized-source archive, so replacing or
deleting one source does not destroy the other sources. Every compaction request
reserves prompt space and limits supplied source text so its estimated input
stays below 5,000 tokens. Existing `WhatsAppWorkspace.businessInfo` and legacy
long shared-model fields are removed automatically when knowledge is loaded.
