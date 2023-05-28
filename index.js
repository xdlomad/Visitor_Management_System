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


const app = express()
const port = 2000

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

app.post('/login', async (req, res) => {
    let data = req.body
    // res.send(' Post request '+ JSON.stringify(data));
    //res.send(' Post request '+ data.name +data.password)
    //res.send(login(data.username,data.password));
    const loginuser = await login(data);
    res.send("Login successful! :D, Welcome " + loginuser.name + "!")
  });

app.post('/register',(req, res)=>{
  let data = req.body
  res.send(
    register(
      data.username,
      data.password,
      data.name,
      data.email
    )
  )
})


async function login(login) {
  console.log("Alert! Alert! Someone is logging in!") //Display message to ensure function is called
  //Verify username is in the database
  console.log(login)
  const verify = await user.find(login).next();
    if (verify){
      return(verify);
    }else {
      return({error: "User not found"});
    }
    }

function register(newusername, newpassword, newname, newemail) {
  //verify if username is already in databse
  let match = dbUsers.find(element => 
    element.username == newusername
      )
    if (match) {
      return ( "Error! username is already taken :D")
    } else {
      // add info into database
      dbUsers.push({
      username : newusername,
      password : newpassword,
      name : newname,
      email : newemail
      })
          return ( "Registration successful! :D" )
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

