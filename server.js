/**
 * @author Koen Bonnet, GOODGRID
 * @email koen@goodgrid.nl
 * @create date 2021-12-26 10:41:01
 * @modify date 2021-12-27 11:50:12
 * @desc [description]
 */

import express from 'express'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import boxApi from './boxapi.js'
import jiraApi from './jiraapi.js'
import config from './config.js'

const app = express();
app.use(bodyParser.json())
app.listen(3000, () => console.log('Webhook proxy is listening on port 3000.'));


app.post('/', (req, res) => {
    let errors = []
    if (config.debug) console.log("Incoming webhook!")
    

    // Check signature of webhook => TODO
    if (isValidSigature(req)) {
        const re = `(${config.jira.issuePrefix}-[0-9]*)`
        const match = req.body.source.name.match(re)
    
        // Check for issue key in document name
        if (match !== null) {
            const issueNumber = match[1]
    
            // Fetch status of document
            boxApi.get(`files/${req.body.source.id}/metadata/enterprise_${config.box.app.enterpriseID}/${config.box.metadataTemplate}`)
            .then(resultMetadata => {
                if (config.debug) console.log(`Webhook was sent for document '${req.body.source.name}' getting status '${resultMetadata.data.status}'`)

                // Fetch possible transitions for issue
                return jiraApi.get(`issue/${issueNumber}/transitions`)
                .then(resultTransitions => {
                    if (config.debug) console.log(`Possible destination statusses for project task ${issueNumber}: ${resultTransitions.data.transitions.map(transition => transition.to.name).join(", ")}`)

                    // Getting the transition to get the task into the desired status
                    return resultTransitions.data.transitions.find(transition => transition.to.name == config.statusMapping[resultMetadata.data.status])
                })
                .catch(error => {
                    console.log(error)
                })

            })  
            .then(resultTransition => {
                if (resultTransition !== undefined) {
                    // Transition project task to status found to be matching document status
                    jiraApi.post(`issue/${issueNumber}/transitions`,{
                        "transition":{
                            "id": resultTransition.id
                        }
                    })
                } else {
                    throw new Error("There is no transition to a project task status relating to the document status")
                }
            })
            .then(response => {
                // Updating comment to indicate what happened
                jiraApi.post(`issue/${issueNumber}/comment`, {
                        "body": {
                            "type": "doc",
                            "version": 1,
                            "content": [{
                                "type": "paragraph",
                                "content": [{
                                    "type": "text",
                                    "text": `This task was transitioned into a new status because of the approval status for document ${req.body.source.name} (https://app.box.com/file/${req.body.source.id})`
                                }]
                            }]
                        }
                })
            
            })
            .then(response => {
                if (config.debug)  console.log("Finished processign webhook")
                res.send('Hook processed.');
            })
            .catch(error => {
                if (config.debug) console.log((error.response)?error.response:error.message)
                res.status(500).send("Error in processing chain: " + escapeHtml(error.message))
            })
        } else {
            res.status(500).send("No issue number found in document name. The project task needs to be manually aligned with the document status.")
        }    
    } else {
        res.status(500).send("The webhook signature is expired or invalid")
    }
});


const isValidSigature = (request) => {

    var timestamp = request.headers['box-delivery-timestamp'];
    var date = Date.parse(timestamp);
    var expired = Date.now() - date > 10*60*1000;

    if (!expired) {
        const hmac1 = crypto.createHmac('sha256', config.box.webhookKey1);
        hmac1.update(JSON.stringify(request.body));
        hmac1.update(timestamp);
        const digest1 = hmac1.digest('base64');
        if (request.headers['box-signature-primary'] == digest1) {
            if (config.debug)  console.log("Primary Signature succesfully validated")
            return true
        }

        const hmac2 = crypto.createHmac('sha256', config.box.webhookKey2);
        hmac2.update(JSON.stringify(request.body));
        hmac2.update(timestamp);    
        const digest2 = hmac2.digest('base64');
        if (request.headers['box-signature-primary'] == digest1) {
            if (config.debug)  console.log("Secondary Signature succesfully validated")
            return true
        }
        if (config.debug)  console.log("None of the signatures is valid")
        return false
        
    } else {
        if (config.debug)  console.log("The signature has expired")
        return false
    }
}

