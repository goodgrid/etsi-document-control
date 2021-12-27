/**
 * @author Koen Bonnet, GOODGRID
 * @email koen@goodgrid.nl
 * @create date 2021-12-26 10:41:44
 * @modify date 2021-12-26 10:41:45
 * @desc [description]
 */
import axios from 'axios'
import config from './config.js'


// TODO: Evaluate Atlassian Connect to prevent use of basic authentication

const jiraApi = axios.create({
    baseURL: config.jira.baseUrl,
    headers: {"Authorization": "Basic " + Buffer.from(config.jira.username + ":" + config.jira.password).toString('base64')}
})


export default jiraApi


