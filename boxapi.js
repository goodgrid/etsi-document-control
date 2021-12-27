/**
 * @author Koen Bonnet, GOODGRID
 * @email koen@goodgrid.nl
 * @create date 2021-12-26 10:41:38
 * @modify date 2021-12-26 10:41:39
 * @desc [description]
 */
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import config from './config.js'

// A place to save the access token after it was minted
let access_token = "initial-dummy"

// Just setting the baseUrl for an Axios instance using for using the API.
// Talking to the Token Service is done via the generic Axios instance,
// so the interceptors are only tied to this boxApi instance.
const boxApi = axios.create({
    baseURL: config.box.baseUrl,
})


// This Mint Token function is creating a signed JWT and exchanging it for an 
// access token at Box. The function is only called by the response interceptor,
// so the first request after starting the Legacy Link Conversion service is
// always initially getting a 401 and triggers the minting a token.
const mintToken = () => {
    if (config.debug) console.log("Minting new token")
    
    const assertion = jwt.sign(
        { // The Claims
            iss: config.box.app.boxAppSettings.clientID,
            sub: config.box.app.enterpriseID,
            box_sub_type: "enterprise",
            aud: config.box.tokenUrl,
            jti: crypto.randomBytes(64).toString("hex"),
            exp: Math.floor(Date.now() / 1000) + 60
        },
        { // The Key
            key: config.box.app.boxAppSettings.appAuth.privateKey,
            passphrase: config.box.app.boxAppSettings.appAuth.passphrase
        }, 
        { // The Header
            'algorithm': 'RS512',
            'keyid': config.box.app.boxAppSettings.appAuth.publicKeyID
        })

    return axios.post(config.box.tokenUrl, {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: assertion,
        client_id: config.box.app.boxAppSettings.clientID,
        client_secret: config.box.app.boxAppSettings.clientSecret
    })
    .then(response => {
        if (config.debug) console.log("Received access token", response.data.access_token)
        return response.data.access_token
    })
    .catch(error => {
        console.log("Error in minting chain")
        console.log(error)
        if (config.debug) console.log((error.response)?error.response.data:error)
    })
}



// We are adding the Authorization header via request interceptor, so we are sure
// any updated access token is read from the variable.
boxApi.interceptors.request.use(request => {
    request.headers.common.Authorization = `Bearer ${global.access_token}`;
    return request;
  }, function (error) {
    return Promise.reject(error);
  });


// Via response interceptor, the status code of any API request is checked. If the 
// response is 401 (Unauthorized), then we are calling the Mint Token function
// to generate a new JWT and exchange is for an access token, which is then
// used from that moment on.
boxApi.interceptors.response.use(null, (error) => {
    if (error.config && error.response && error.response.status === 401) {
        return mintToken().then((token) => {
            global.access_token = token
            error.config.headers.Authorization = `Bearer ${token}` //<= set the token
            return boxApi.request(error.config);
        });
    }
    return Promise.reject(error);
});

export default boxApi