const express = require('express')
const jwt = require('jsonwebtoken');

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
const visitor = client.db("Visitor_Management_v1").collection("visitor")
const visitor_log = client.db("Visitor_Management_v1").collection("visitor_log")


const app = express()
const port = 3000

//Database of users
app.use(express.json());

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get('/hello', (req, res) => {
  res.send("hello world")
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
async function qrRead(filename) {
  //read the file
  const buffer = await fs.readFileSync('./' + filename);
  //read the buffer
  const image = await jimp.read(buffer);
  // Creating an instance of qrcode-reader module
  const qr = new qrCode_r();
  //wait for promise to resolve
  const value = await new Promise((resolve, reject) => {
    qr.callback = (err, v) => err != null ? reject(err) : resolve(v);
    qr.decode(image.bitmap);
  });
  //parse the result
  const final = JSON.parse(value.result)
  return final
}

//function to create qrcode file
function qrCreate(data){
let stringdata = JSON.stringify(data)
//create the file
qrCode_c.toFile(path.join('./identification.png'), stringdata, (err)=>{
  if (err) throw err;
});
}

