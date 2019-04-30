const app = require('express')()
const server = require('http').Server(app)
const tcpPort = process.env.PORT || 4113
const io = require('socket.io')(server)
const SerialPort = require('serialport')
const SimpleNodeLogger = require('simple-node-logger')
const config = require('./config.json')

let env = process.argv[2] || 'dev'
switch (env) {
    case 'dev':
        console.log(`starting in development mode`)
        break;
    case 'prod':        
        console.log(`starting in production mode`)
        break;
}
process.on('uncaughtException', err => {
    console.log('err: ', err)
    console.log('stack trace: ', err.stack)
    setInterval(() => {}, 2000)
})

// create logger instance
let log = SimpleNodeLogger.createSimpleLogger({
    logFilePath:'general.log',
    timestampFormat:'YYYY-MM-DD HH:mm:ss'
})

// start listening
server.listen(tcpPort, () => log.info(`listening on http://localhost:${tcpPort}`))

if (env === 'dev') {
    app.get('/', (req, res) => {
        res.sendFile('./public/index.html', { root: __dirname })
    }) 
    io.on('connection', socket => {
        log.info('connected')
        socket.on('getValue', () => {
            let num = Math.floor(Math.random() * 51)
            console.log(`emitting ${num}`)
            socket.emit('newWeight', {weight: num})
        })
    })   
}
else {
    const Readline = SerialPort.parsers.Readline
    const parser = new Readline()
    const port = new SerialPort(config.path, config)
    
    port.open(err => {
        if (err) {  
            log.warn(err)
            return
        }       
    })    
    port.pipe(parser)

    io.on('connection', socket => {
        log.info('connected')
        port.on('open', () => log.info('Port is open'))
        port.on('error', err => log.info(`Error: ${err.message}`))
        parser.on('data', data => {
            let currentBalanceData = 0
            currentBalanceData = data.toString().trim()
            log.info(currentBalanceData)
            socket.emit('newWeight', {weight: currentBalanceData})        
        })
    })
}