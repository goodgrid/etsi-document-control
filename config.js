/**
 * @author Koen Bonnet, GOODGRID
 * @email koen@goodgrid.nl
 * @create date 2021-12-26 10:41:33
 * @modify date 2021-12-27 11:08:26
 * @desc [description]
 */



/*
    ==> debug put on true enables extra logging, including the Box acces token (warning!)
    ==> statusMapping is a base64 encoded JSON object structured like this:
        {
            boxStatus1: jiraStatus1,
            boxStatus2: jiraStatus2
        }
        It related the document status in Box to a task status for that document in Jira.
    ==> jira.baseUrl the url of the Atlassian API
    ==> jira.username contains the user connecting to the Atlassian API
    ==> jira.password contains the API token generated for the API user
    ==> jira.issuePrefix contains the short code of the Jira project to recognize the 
        issue number from the Box document name.
    ==> box.baseUrl contains the url of the Box API
    ==> box.tokenUrl contains the oAuth2 token endpoint
    ==> box.metadataTemplate contains the name of the metadata template to query the status
    ==> app contains the base64 encoded contents of the file that can be downloaded from 
        Box with the app settings. It contains the client id and secret, the key pair id,
        the private key and the Box enterprise id.
*/

const config = {
    debug: true,
    statusMapping: JSON.parse(Buffer.from(process.env.statusMappingBase64, 'base64').toString()),
    jira: {
        baseUrl: process.env.jiraBaseUrl,
        username: process.env.jiraUsername,
        password: process.env.jiraPassword,
        issuePrefix: process.env.jiraIssuePrefix
    },
    box: {
        baseUrl: process.env.boxBaseUrl,
        tokenUrl: process.env.boxTokenUrl,
        metadataTemplate: process.env.boxMetadataTemplate,
        app: JSON.parse(Buffer.from(process.env.boxAppConfigBase64, 'base64').toString()),
        webhookKey1: process.env.boxWebhookKey1,
        webhookKey2: process.env.boxWebhookKey2
      }     
}
export default config