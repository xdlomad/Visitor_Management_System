const express = require('express')
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://username:password@firstdatabase.3xnid7z.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true, 
  }
});

//qrCode_creator
const qrCode_c = require('qrcode');
const path = require('path');

//qrCode Reader
const jimp = require("jimp");
const fs = require('fs')
const qrCode_r = require('qrcode-reader');

// Connect the client to the server	(optional starting in v4.7)
client.connect();

// Send a ping to confirm a successful connection
const user = client.db("Visitor_Management_v1").collection("users")
const visitor = client.db("Visitor_Management_v1").collection("visitors")
const visitor_log = client.db("Visitor_Management_v1").collection("visitor_log")


const app = express()
const port = 3000

//Database of users
app.use(express.json());

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get('/verify', verifyToken, (req, res) => {
    console.log(req.user)
  })

app.get('/login', async (req, res) => {
    let data = req.body
    const loginuser = await login(data);
    if (loginuser) {
    res.write(loginuser.user_id + " has logged in!")
    res.end("\nWelcome "+ loginuser.name + "!")
    }else {
      res.send("Wrong user id or password inputed D:")
    }
  });


app.post('/registeruser', async (req, res)=>{
  let data = req.body
  if (data.currentrole == "security" || data.currentrole == "resident"){
    res.send("you do not have access to registering users!")
  }else if (data.currentrole == "admin" ){
    const lmao = await registerUser(data)
    if (lmao){
      res.send("Registration request processed, new user is " + lmao.name)
    }else{
      res.send("Error! User already exists!")
    }
  }else {
      res.send("Error! Please enter a valid role!")
    }
  }
)

app.post('/registervisitor', async (req, res)=>{
  let data = req.body
  const lmao = await registerVisitor(data)
    if (lmao){
      res.send("Registration request processed, visitor is " + lmao.name)
    }else{
      res.send("Error! Visitor already exists!, Add a visit log instead!")
    }
  }
)

app.get('/createQRvisitor', async (req, res)=>{
  let data = req.body
  const lmao = await qrCreate(data)
    if (lmao){
      res.send("QR code created for visitor! " + lmao)
    }else{
      res.send("No such visitor found")
    }
  }
)

app.get('/readQRvisitor', async (req, res)=>{
  let data = req.body
  const visitorInfo = await qrRead(data)
    if (visitorInfo){
      res.write("Visitor: ")
      res.end(visitorInfo)
    }else{
      res.send("QR code undefined")
    }
  }
)
async function login(data) {
  console.log("Alert! Alert! Someone is logging in!") //Display message to ensure function is called
  //Verify username is in the database
  let verify = await user.find(data).next();
  if (verify){
    return(verify);
  }else {
    return
    }
  }

async function registerUser(newdata) {
  //verify if username is already in databse
  const match = await user.find({user_id : newdata.user_id}).next()
    if (match) {
      return 
    } else {
      // add info into database
      await user.insertOne({
        "user_id": newdata.user_id,
        "password": newdata.password,
        "name": newdata.name,
        "unit": newdata.unit,
        "hp_num" : newdata.hp_num,
        "role" : newdata.role
      })
          return (newdata)
      }  
  }

async function registerVisitor(newdata) {
  //verify if username is already in databse
  const match = await visitor.find({"ref_num": newdata.ref}).next()
    if (match) {
      return 
    } else {
      // add info into database
      await visitor.insertOne({
        "ref_num" : newdata.ref,
        "name": newdata.name,
        "IC_num": newdata.IC_num,
        "car_num": newdata.car_num,
        "hp" : newdata.hp_num,
        "pass": newdata.pass,
        "category" : newdata.category,
        "visit_date" : newdata.date,
        "unit" : newdata.unit,
        "user_id" : newdata.user_id
      })
          return (newdata)
    }  
}

  function generateToken(loginProfile){
    return jwt.sign(loginProfile, 'very_long_long_long_long_numbers_alphabets_lmao_stillgoing_password', { expiresIn: '1h' });
  }

  function verifyToken(req, res, next){
    //let token = req.headers['authorization'].split(' ')[1];
    let header = req.headers.authorization
    let token = header.split(' ')[1]
    jwt.verify(token,'very_long_long_long_long_numbers_alphabets_lmao_stillgoing_password',function(err,decoded){
      if(err) {
        res.send("invalid token")
      }
      req.user = decoded // bar

      next()
    });
  }


  //function to read qrcode file
async function qrRead(data) {
  //read the file
  const buffer = await fs.readFileSync('./' + data.file);
  //read the buffer
  const image = await jimp.read(buffer);
  // Creating an instance of qrcode-reader module
  const qr = new qrCode_r();
  //wait for promise to resolve
  final =""
  qr.callback = function (err, value) {
    if (err) {
        console.error(err);
    }
    // Let result equal final
    final = value.result
  };
  // Decoding the QR code
  qr.decode(image.bitmap);
  //return the read data
  if (final){
    return final
  }else {
    return
  }
}

//function to create qrcode file
async function qrCreate(data){
  console.log(data.IC_num)
  visitorData = await visitor.find({"IC_num" : data.IC_num}, {projection : {"ref_num" : 1 , "name" : 1 , "category" : 1 , "hp" : 1, "_id" : 0}}).next()
  if(visitorData){
    let stringdata = JSON.stringify(visitorData)
    //create the file
    qrCode_c.toFile(path.join('./visitorPass.png'), stringdata, (err)=>{
      if (err) throw err;
    });
    return ("visitorPass.png")
}else{
  return
}
  }

