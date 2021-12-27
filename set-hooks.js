import readline from 'readline'
import boxApi from './boxapi.js'

// Set up asking prompts
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Collect the folderId and then the address before calling the function to set up
// the webhook
rl.question('What is the id of the folder to put the webhook on? ', function (folderId) {
    rl.question('What is the url to send the webhook to? ', function (address) {
        setHook(folderId, address)
        .then(response => {
            console.log(response.statusText)
            rl.close();
        })
        .catch(error => {
            console.log("Settup up webhook failed: " + error.response.statusText)
            rl.close()
        })
    });
});



const setHook = (folderId,address) => {
    return boxApi.post(`webhooks`,{
        "target": {
          "id":  folderId, //"152611398183",
          "type": "folder"
        },
        "address": address,//"https://f428-2001-985-74ff-1-a9ad-433e-96f9-d95.ngrok.io/",
        "triggers": [
          "METADATA_INSTANCE.UPDATED"
        ]
      })
} 