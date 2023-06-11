const express = require('express')
const jwt = require('jsonwebtoken');

//encryption variables
const bcrypt = require('bcrypt');
const saltRounds = 10;

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://b022110096:l8y6PQc3ylvAL1oe@firstdatabase.3xnid7z.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true, 
  }
});

//qrCode_creator variables
const qrCode_c = require('qrcode');
const path = require('path');

//qrCode Reader variables
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

//json express variables
const app = express()
const port = 3000

//decode requests
app.use(express.json());

//start of port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

//login GET request
app.get('/login', async (req, res) => {
    let data = req.body
    let result = await login(data);
    const loginuser = result.verify
    console.log(loginuser)
    const token = result.token
    //check the returned result if its a object, only then can we welcome the user
    if (typeof loginuser == "object") { 
      res.write(loginuser.user_id + " has logged in!")
      res.write("\nYour token : " + token)
      res.end("\nWelcome "+ loginuser.name + "!")
    }else {
      //else send the failure message
      res.send(result)
    }
  });

//register user post request
app.post('/registeruser', verifyToken, async (req, res)=>{
  let authorize = req.user.role //reading the token for authorisation
  console.log(authorize)
  let data = req.body //requesting the data from body
  //checking the role of user
  if (authorize == "security" || authorize == "resident"){
    res.send("you do not have access to registering users!")
  }else if (authorize == "admin" ){
    const newUser = await registerUser(data)
    //console.log(newUser)
  
    if (newUser){
      res.send("Registration request processed, new user is " + newUser.name)
    }else{
      res.send("Error! User already exists!")
    }
  //token does not exist
  }else {
      res.send("Token not valid!")
    }
  }
)

app.patch('/updateuser', verifyToken, async (req, res)=>{
  let authorize = req.user.role //reading the token for authorisation
  let data = req.body //requesting the data from body
  //checking the role of user
  if (authorize == "security" || authorize == "resident"){
    res.send("you do not have access to update user information!")
  }else if (authorize == "admin" ){
    const result = await updateUser(data)
    if (result){
      res.send("User updated! " + result.value.name)
    }else{
      res.send("Error! User does not exist!")
    }
  }else {
      res.send("Authorization and token is not found!")
    }
})

//delete user DELETE request
app.delete('/deleteuser', verifyToken, async (req, res)=>{
  let data = req.body
  let authorize = req.user.role
  //checking the role of user
  if (authorize == "security" || authorize == "resident"){
    res.send("you do not have access to registering users!")
  }else if (authorize == "admin" ){
    const lmao = await deleteUser(data)
    //checking if item is deleted
    if (lmao.deletedCount == "1"){
      res.send("user deleted " + data.name)
    }else{
      res.send("Error! no user found!")
    }
  }else {
      res.send("Token not valid!")
    }
  }
)

//register visitor POST request
app.post('/registervisitor', verifyToken, async (req, res)=>{
  let authorize = req.user.role
  let data = req.body
  //checking if token is valid
  if(authorize){
  const lmao = await registerVisitor(data)
    if (lmao){
      res.send("Registration request processed, visitor is " + lmao.name)
    }else{
      res.send("Error! Visitor already exists!, Add a visit log instead!")
    }
  }else {
      res.send("Not a valid token!")
    }
  }
)

app.patch('/updatevisitor', verifyToken, async (req, res)=>{
  let authorize = req.user.role
  let data = req.body
  //checking if token is valid
  if(authorize){
  const resultupdate = await updateVisitor(data)
    if (resultupdate){
      res.send("Visitor updated! " + resultupdate.value.name)
    }else{
      res.send("Error! Visitor does not exist!")
    }
  }else {
      res.send("Not a valid token!")
    }
  })

//delete visitor DELETE request
app.delete('/deletevisitor', verifyToken, async (req, res)=>{
  let data = req.body
  let authorize = req.user.role
  //checking if token is valid
  if(authorize){
  const lmao = await deleteVisitor(data)
    if (lmao.deletedCount == "1"){
      res.send("Goodbye " + lmao.name)
    }else{
      res.send("Error! No such visitor found D: , perhaps you actually wished your ex visited?")
    }
  }else {
      res.send("Not a valid token!")
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
app.post('/checkIn', verifyToken, async (req, res)=>{
  let data = req.body
  let authorize = req.user.role
  //checking role of users
  if (authorize == "security" || authorize == "admin"){
    const logData = await createLog(data)
    if (logData){
      res.send({message : "Visitor Log Created!",logData})
    }else{
      res.send("Error! Log already exist!")
    }
  }else if (authorize == "resident" ){
    res.send("You do not have access to create visitor logs!")
  }else{
    res.send("token not valid D:")
    }
  })

//update a visitor log to checkout visitor
app.patch('/checkOut', verifyToken, async (req, res)=>{
  let data = req.body
  let authorize = req.user.role
  if (authorize == "security" || authorize == "admin"){
    const logData = await updateLog(data)
    if (typeof logData == "object"){
      res.send( "Visitor succesfully checkout")
    }else{
      res.send("Error! Could not find log :[")
    }
  }else if (authorize == "resident" ){
    res.send("You do not have access to update visitor logs!")
  }else{
    res.send("Error! Please enter a valid role!")
    }
  }) 
//bcrypt login function
// async function login(data) {
//   console.log("Alert! Alert! Someone is logging in!") //Display message to ensure function is called
//   //Verify username is in the database
//   let verify = await user.find({user_id : data.user_id}).next();
//   if (verify){

//     const match = await bcrypt.compare(data.password,verify.password);   
//     console.log(match)
//     if(match)
//     {
//       token = generateToken(verify)
//       return{verify,token};
//     }
//     else
//     {
//         return "Wrong password"
//     }
//   }else{
//     return ("Wrong user id D:")
//   }
//   }
async function login(data) {
  console.log("Alert! Alert! Someone is logging in!") //Display message to ensure function is called
  //Verify username is in the database
  let verify = await user.find({user_id : data.user_id}).next();
  if (verify){
    //verify password is correct
    if (verify.password == data.password){
      token = generateToken(verify)
      return{verify,token};
    }else{
      return ("Wrong password D:")
    }
  }else{
    return ("Wrong user id D:")
}}

async function registerUser(newdata) {
  //verify if there is duplicate username in databse
  const match = await user.find({user_id : newdata.user_id}).next()
    if (match) {
      return 
    } else {
      // add info into database
      
      const hashh = await encryption(newdata.password)
      console.log(hashh)
      await user.insertOne({
        "user_id": newdata.user_id,
        "password": hashh,
        "name": newdata.name,
        "unit": newdata.unit,
        "hp_num" : newdata.hp_num,
        "role" : newdata.role
      })
      const dataa=await user.find({user_id : newdata.user_id}).next()
      //console.log(dataa)
      return (dataa)
      }}
    
async function updateUser(data) {

  data.password = await encryption(data.password)
  result = await user.findOneAndUpdate({user_id : data.user_id},{$set : data}, {new: true})
  if(result){
    return (result)
  }else{
    return
  }
}

async function deleteUser(data) {
  //verify if username is already in databse
  const match = await user.find({user_id : data.user_id}).next()
    if (match) {
      success = await user.deleteOne({user_id : data.user_id})
      return (success) // return success message
    } else {
      return
      }  
  }

async function registerVisitor(newdata) {
  //verify if there is duplciate ref_num
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

async function updateVisitor(data) {
  result = await visitor.findOneAndUpdate({ref_num : data.ref_num},{$set : data}, {new:true})
  if(result){
    return (result)
  }else{
    return
  }
}

async function deleteVisitor(newdata) {
  //verify if username is already in databse
  const match = await visitor.find({ref_num : newdata.ref_num}).next()
    if (match) {
      const success  = await visitor.deleteOne({ref_num : newdata.ref_num})
      return (success)
    } else {
      return
      }  
  }


async function createLog(newdata) {
  //verify if there is duplicate log id
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
  let header = req.headers.authorization
  let token = header.split(' ')[1] //checking header
  jwt.verify(token,'very_long_long_long_long_numbers_alphabets_lmao_stillgoing_password',function(err,decoded){
    if(err) {
      res.send("invalid token")
    }
    req.user = decoded // bar

    next()
  });
}

async function encryption(data){
  const salt= await bcrypt.genSalt(saltRounds)
  const hashh = await bcrypt.hash(data,salt)
  return hashh
}