const mongoose = require('mongoose')
const express = require('express')
const path = require('path')
const app = express()
const server = require('http').Server(app)
const io = require("socket.io")(server)
const serveStatic = require('serve-static')

app.use('/', serveStatic(path.join(__dirname, '/dist')))

const connectionParams = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
}

const ContactSchema = new mongoose.Schema({
    name: String,
    phone: String,
    avatar: {
        type: String,
        default: "empty"
    },
    contacts: {
        type:[mongoose.Schema.Types.Map],
        default: []
    },
    messages: {
        type:[mongoose.Schema.Types.Map],
        default: []
    }
}, { collection : 'mycontacts' });

const ContactModel = mongoose.model('ContactModel', ContactSchema);

const url = `mongodb+srv://glebClusterUser:glebClusterUserPassword@cluster0.fvfru.mongodb.net/contacts?retryWrites=true&w=majority`;
mongoose.connect(url, connectionParams)
    .then( () => {
        console.log('Connected to database ')
    })
    .catch( (err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })

app.get('/sockets/connect', (req, res) => {
    // io.on('connection', (socket) => {
    //     console.log(`Присоединился socket.id: ${socket.id}`)
    //     socket.on('disconnect', function() {
    //         console.log(`Отключился socket.id: ${socket.id}`)
    //     })
    // })
})

app.get('/contacts/create', (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, X-Access-Token, X-Socket-ID, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

    
    new ContactModel({ name: req.query.name, phone: req.query.phone }).save(function (err, newContact) {
        if(err){
            return res.json({ "status": "Error" })
        }
        return res.json({ "status": "OK", "id": newContact._id })
    })
    
})

app.get('/contacts/get', (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, X-Access-Token, X-Socket-ID, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    
    let query = ContactModel.findOne({ _id: req.query.id })
    query.exec((err, contact) => {
        if(err){
            return res.json({ "status": "Error" })
        }
        return res.json({ "status": "OK", "contact": contact })
    })
    
})


app.get('/contacts/list', (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, X-Access-Token, X-Socket-ID, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

    let query = ContactModel.find({})
    query.exec((err, allContacts) => {
        if (err){
            return res.json({ status: 'Error' });
        }
        return res.json({ contacts: allContacts, "status": "OK" })
    })

})


app.get('/contacts/add', (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, X-Access-Token, X-Socket-ID, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

    let insertContact = true
    let query = ContactModel.findOne({ _id: req.query.contactid })
    query.exec((err, currentContact) => {
        if(err){
            return res.json({ status: "Error" })
        }
        currentContact.contacts.map(bindingContact => {
            console.log(`new Map(bindingContact).get('id'): ${new Map(bindingContact).get('id')}, req.query.othercontactid: ${req.query.othercontactid}`)
            if(new Map(bindingContact).get('id').includes(req.query.othercontactid)){
                insertContact = false
            }
        })
        if(insertContact){
            let queryOfOtherContact = ContactModel.findOne({ _id: req.query.othercontactid })
            queryOfOtherContact.exec((err, otherContact) => {
                if(err) {
                    return res.json({ "status": "Error" })
                }
                ContactModel.updateOne({ _id: req.query.contactid },
                    { $push: 
                        { 
                            contacts: [
                                {
                                    id: req.query.othercontactid,
                                    name: otherContact.name,
                                    phone: otherContact.phone,
                                    avatar: "empty"
                                }
                            ]
                        }
                }, (err, user) => {
                    ContactModel.updateOne({ _id: req.query.othercontactid },
                        { $push: 
                            { 
                                contacts: [
                                    {
                                        id: req.query.contactid,
                                        name: currentContact.name,
                                        phone: currentContact.phone,
                                        avatar: "empty"
                                    }
                                ]
                            }
                    }, (err, user) => {
                        if(err){
                            return res.json({ "status": "Error" })    
                        }
                        return res.json({ "status": "OK" })
                    })
                })
            })
        }
    })
})

app.get('/contacts/messages/add', (req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, X-Access-Token, X-Socket-ID, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

    ContactModel.updateOne({ _id: req.query.contactid },
        { $push: 
            { 
                messages: [
                    {
                        id: req.query.contactid,
                        message: req.query.message,
                    }
                ]
                
            }
    }, (err, contact) => {
        if(err){
            return res.json({ "status": "Error" })        
        }
        ContactModel.updateOne({ _id: req.query.othercontactid },
            { $push: 
                { 
                    messages: [
                        {
                            id: req.query.contactid,
                            message: req.query.message,
                        }
                    ]
                    
                }
        }, (err, othercontact) => {
            if(err){
                return res.json({ "status": "Error" })        
            }
            return res.json({ "status": "OK" })
        })
    })
})

app.get("**", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, X-Access-Token, X-Socket-ID, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

    return res.json({ "status": "Error" })
})

const port = process.env.PORT || 8080
// const port = 4000 

// server.listen(port)
app.listen(port)