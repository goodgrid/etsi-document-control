
# ETSI Documnent Control

- [ETSI Documnent Control](#etsi-documnent-control)
  - [Introduction](#introduction)
  - [Setup](#setup)
    - [Metadata template](#metadata-template)
    - [Configuring Box App, including webhook signatures](#configuring-box-app-including-webhook-signatures)
    - [Setting up the webhook](#setting-up-the-webhook)
    - [Setting up the Atlassian API token](#setting-up-the-atlassian-api-token)

## Introduction
This interface between Box and Jira can be used to let a Box Relay workflow signal to Jira that a task can be progressed. ETSI Document Control 
creates a relationship between the status of a document in Box and the status of a project task in Jira. If enabled, for every update of the 
document status in the metadata (normally by a Box Relay workflow), a webhook is sent to this ETSI Document Control Service. This service:
- receives the webhook, 
- validates the Box signature (TODO), 
- Queries the document status from Box
- Looks up the corresponding Jira status in the config status mapping,
- queries the possible transition to get into the desired status,
- transitions the project task into the desired state (if the transition is available),
- adds a comment to the project task about the event.
- Responds to the webhook with HTTP200.

If the signature isnt valid (TODO), no jira issue number is recognized from the document name or something
unexpected happens while executing (including a transition into the desired state not being unavailable) an error status HTTP500 is 
returned. Box will retry 10 times upon receiving an error status response.

## Setup

### Metadata template
This app requires a metadata template to be present with a property called 'status'. Typically this would be a option list with a single value. The 
name of the property needs to be configured in the setting box.metadataTemplate. How the property values relate to the Jira workflow statusses needs 
to be configured in the setting statusMapping. See config.js for the object structure.


### Configuring Box App, including webhook signatures
To be able to query the document triggering the webhook, a Custom App is configured in Box. This must be an oAuth2 client with JWT server verification. 
This configuration produces a client id with secret, a keypair to sign the JWT and a service account user out of whose name the app will work. For regular 
use, the only selected scope should be to read all files and folders in Box. 

On top of the oAuth scopes, the service account needs appropiate permissions on the content. A main folder containing the documents under control of this
app should be readable by the service account and should also have a webhook configured (next paragraph).

Now, in the Box App Settings, on tab 'Webhooks', generate both the primary key and the secundary key. The secondary key will be verified if the primary
key fails verification to allow to key rotation without interruptions.

After configuring the app, the app settings can be downloaded as a JSON file from the 'Configuration' tab. Download the file, base64 encode it
and included the resulting string in the 'boxAppConfigBase64' environment variable.

### Setting up the webhook
A folder must be determined to have the webhook configured on. The webhook will trigger on every metadata instance update on every file within the folder 
or subfolders. The webhook must be setup using the service account belonging to the app defined in the previous paragraph to make sure that the webhook 
signatures are included in the webhook request. Note: We're configuring and using a V2 Webhook.

If the app settings from the previous paragraph have been set, downloaded as JSON, bases64 encoded and included in the configruation (via environment 
variables), the webhook can now be configured via the included node.js script 'set-hook.js'. This script uses the Box app settings to communicate to
the Box API and sets a webhook. Before this can work, the app should have the 'Manage webhooks' scope applied. Re-submit the app to the Box admin
for any change to the App Settings in Box.

The set-hook.js script will ask for the id of the folder to apply the webhook on and the endpoint to send the webhook to.

After setting up the webhook, remove the 'Manage webhooks' scope from the Box App Settings and re-submit the app to make settings active.


### Setting up the Atlassian API token
*ETSI Document Control is using a regular Atlassian account with an API token to connect to Jira. Although Atlassian does have oAuth2 mechanism available,
this doet not fit this use case, since only the oAuth access code flow (3-legged authentication) is available and this is a server to server integration.
Also, the oAuth flow, using the Atlassian Connect Node Express middleware, uses persistent storage for the secrets. This is not something we prefer running
in Docker containers where secrets are managed via (sealed) environment variables.*

The global setup is to add managed user to Atlassian, grant the user access to the relevant jira products and projects and add an API token to the
account. Below the detailed instructions:

- Add a user to Atlassian and grant the user access to the relevant jira project
- Log in as the user and navigate to https://id.atlassian.com
- Open "Account Settings" and choose "Security" from the menu
- Go to "Create and manage API token" and click "Create API token"
- Name the purpose of the token, for example ETSI Document Control


