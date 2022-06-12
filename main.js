const express = require('express');
const path = require("path")
const ContendorSQL = require('./ContendorSQL');
var socketIOfileUpload = require("socketio-file-upload");
const { Server: HttpServer } = require("http")
const { Server: SocketServer } = require("socket.io");

const app = express();
const PORT = 8080;

const SQLite3options = {
    client: 'sqlite3',
    connection: {
        filename: 'DB/ecommerce.sqlite'
    }
}

const MYSQLoptions = {
    client: 'mysql',
    connection: {
        filename: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'ecommerce'
    }
}

const productsTable = {
    tableName: "products",
    tableColumns: [
        {
            type: "increment",
            name: "id"
        },
        {
            type: "string",
            name: "productName"
        },
        {
            type: "float",
            name: "productPrice"
        },
        {
            type: "string",
            name: "productImage"
        }
    ]
}

const messagesTable = {
    tableName: "messages",
    tableColumns: [
        {
            type: "increment",
            name: "id"
        },
        {
            type: "string",
            name: "from"
        },
        {
            type: "string",
            name: "time"
        },
        {
            type: "string",
            name: "content"
        }
    ]
}

const productsContainer = new ContendorSQL(SQLite3options, productsTable)
const msgContainer = new ContendorSQL(SQLite3options, messagesTable)

app.use(socketIOfileUpload.router)
app.use("/", express.static("public"))

const httpServer = new HttpServer(app)
const socketServer = new SocketServer(httpServer)

socketServer.on("connection", socket => {

    //new user initizalization routine
    const uploader = new socketIOfileUpload();
    uploader.dir = path.join(__dirname, "/public/images")
    uploader.listen(socket);
    console.log("A new user has connected")
    sendAllProducts(socket)
    sendAllMessages(socket)
    
    socket.on("newProduct", newProduct => {
        console.log("New product received")
        newProduct = JSON.parse(newProduct)
        productsContainer.save(newProduct)
            .then(() => sendAllProducts(socketServer.sockets))
    })

    socket.on("newMessage", message => {
        msgContainer.save(message)
            .then(() => sendAllMessages(socketServer.sockets))

    })
})

const sendAllMessages = (socket) => {
    return new Promise((resolve, reject) => {
        msgContainer.getAll()
            .then((messages) => {
                if (messages.length == 0){
                    socket.emit("newMessages", JSON.stringify({}))
                    resolve()
                }
                else{
                    socket.emit("newMessages", JSON.stringify(messages))
                    resolve()
                }
            })
            .catch((err) => {
                console.log(err)
                socket.emit("error", JSON.stringify({}))
                resolve()
            })
    })
}

const sendAllProducts = (socket) => {
    return new Promise((resolve, reject) => {

    productsContainer.getAll()
        .then((products) => {
            if (products.length == 0){
                socket.emit("productList", JSON.stringify({}))
                resolve()}
            else
               { socket.emit("productList", JSON.stringify(products))
                resolve()}
        })
        .catch((err) => {
            console.log(err)
            socket.emit("error", JSON.stringify({}))
            resolve()
        })
    })
}

httpServer.listen(PORT, () => {
    console.log("Server listening on port " + PORT)
});


