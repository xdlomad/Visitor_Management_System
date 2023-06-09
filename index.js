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
const { send } = require('process');

// Connect the client to the server	(optional starting in v4.7)
client.connect();

// Send a ping to confirm a successful connection
const user = client.db("Visitor_Management_v1").collection("users")
const visitor = client.db("Visitor_Management_v1").collection("visitors")
const visitorLog = client.db("Visitor_Management_v1").collection("visitor_log")


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

//login GET request
app.get('/login', async (req, res) => {
    let data = req.body
    let loginuser = await login(data);
    const user = loginuser.verify
    const token = loginuser.token
    if (typeof loginuser == "object") {
      res.write(user.user_id + " has logged in!")
      res.write("\nYour token : " + token)
      res.end("\nWelcome "+ user.name + "!")
    }else {
      res.send(loginuser)
    }
  });

app.post('/registeruser', verifyToken, async (req, res)=>{
  let authorize = req.user.role
  if (authorize == "security" || authorize == "resident"){
    res.send("you do not have access to registering users!")
  }else if (authorize == "admin" ){
    let data = req.body
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

app.post('/deleteuser', async (req, res)=>{
  let data = req.body
  if (data.currentrole == "security" || data.currentrole == "resident"){
    res.send("you do not have access to registering users!")
  }else if (data.currentrole == "admin" ){
    const lmao = await deleteUser(data)
    if (lmao){
      res.send("user deleted" + lmao.name)
    }else{
      res.send("Error! no user found!")
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
      res.send({message : "Visitor info :",visitorInfo})
    }else{
      res.send("QR code undefined")
    }
  }
)

//create a visitor log
app.post('/checkIn', async (req, res)=>{
  let data = req.body
  if (data.currentrole == "security" || data.currentrole == "admin"){
    const logData = await createLog(data)
    if (logData){
      res.send({message : "Visitor Log Created!",logData})
    }else{
      res.send("Error! Log already exist!")
    }
  }else if (data.currentrole == "resident" ){
    res,send("You do not have access to create visitor logs!")
  }else{
    res.send("Error! Please enter a valid role!")
    }
  })

//update a visitor log to checkout visitor
app.patch('/checkOut', async (req, res)=>{
  let data = req.body
  if (req.user.role == "security" || req.user.currentrole == "admin"){
    const logData = await updateLog(data)
    if (typeof logData == "object"){
      res.send( "Visitor succesfully checkout")
    }else{
      res.send("Error! Could not find log :[")
    }
  }else if (data.currentrole == "resident" ){
    res,send("You do not have access to update visitor logs!")
  }else{
    res.send("Error! Please enter a valid role!")
    }
  }) 

async function login(data) {
  console.log("Alert! Alert! Someone is logging in!") //Display message to ensure function is called
  //Verify username is in the database
  let verify = await user.find({user_id : data.user_id}).next();
  if (verify){
    if (verify.password == data.password){
      token = generateToken(verify)
      return{verify,token};
    }else{
      return ("Wrong password D:")
    }
  }else{
    return ("Wrong user id D:")
  }
  }

async function registerUser(newdata) {
  //verify if username is already in databse
  console.log(newdata)
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

async function deleteUser(newdata) {
  //verify if username is already in databse
  const match = await user.find({user_id : newdata.user_id}).next()
    if (match) {
      await user.deleteOne({user_id : newdata.user_id})
      return (newdata)
    } else {
      return
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


async function createLog(newdata) {
  //verify if username is already in databse
  const match = await visitorLog.find({"log_id": newdata.log_id}).next()
    if (match) {
      return 
    } else {
      // add info into database
      let dateTime = currentTime()
      const log = 
      await visitorLog.insertOne({
        "log_id": newdata.log_id,
        "ref_num" : newdata.ref,
        "CheckIn_Time": dateTime,
        "CheckOut_Time": "",
        "user_id" : newdata.user_id
      })
          return (log)
    }  
}

async function updateLog(newdata) {
  //verify if username is already in databse
  let dateTime = currentTime()
  const newLog = await visitorLog.findOneAndUpdate({"log_id": newdata.log_id},{$set : {CheckOut_Time: dateTime}})
    if (newLog) {
      return (newLog)
    } else {
          return
    }  
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
    return JSON.parse(final)
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

function currentTime(){
  const today = new Date().toLocaleString("en-US", {timeZone: "singapore"})
  return today
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