const mongoose = require('mongoose')

async function main() {
    const localhost = "127.0.0.1"
    const mongodbDefaultPort = 27017
    const uri = `mongodb://${localhost}:${mongodbDefaultPort}/getapet`

    await mongoose.connect(uri)
    console.log('Conectou ao Mongoose!')
}

main()
    .catch(error => console.log(error))

module.exports = mongoose