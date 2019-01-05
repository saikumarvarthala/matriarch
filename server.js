const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient
var db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Remember to change YOUR_USERNAME and YOUR_PASSWORD to your username and password! 
MongoClient.connect('mongodb://root:root12@ds149744.mlab.com:49744/matriarch', (err, database) => {
  if (err) return console.log(err)
  db = database;
  app.listen(process.env.PORT || 3000, () => {
    console.log('listening on 3000')
  })
})

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(express.static('public'))


app.post('/users', (req, res) => {
  if(req.body.email && req.body.username && req.body.password&& req.body.phonenumber){
  db.collection('user').findOne({username:req.body.username},(err,user)=>{
    if(err){
      throw err;
    }
    if(!user){
      db.collection('user').findOne({phonenumber:req.body.phonenumber},(err,phone)=>{
        if(err){
          throw err;
        }
        if(!phone){
          db.collection('user').findOne({email:req.body.email},(err,email)=>{
            if(err){
              throw err;
            }
            if(!email){
              var pass=bcrypt.hashSync(req.body.password,10)
              var obj={
                username    : req.body.username,
                email       : req.body.email,
                phonenumber : req.body.phonenumber,
                password    : pass
              }
              db.collection('user').save(obj, (err, result) => {
                if (err) return console.log(err)
                res.json({message:"data saved"})
              })
            }
            else{
              res.json({message:"email alredy exist.try whith other email"})
            }
          })
        }
        else{
          res.json({message:"phonenumber alredy exist.try whith other phonenumber"})
        }
      })
    }
    else{
      res.json({message:"username alredy exist.try whith other username"})
    }
  })
}
else{
  res.json({message:"email|password|username|phonenumber credentials missing.plzz check."});
}
})

app.post('/login', (req, res) => {
  db.collection('user').findOne({email:req.body.email}, function(err, userInfo){
    if(err){
      next(err);
    } 
    else{
      if(bcrypt.compareSync(req.body.password, userInfo.password)) {//secretKey
        const token = jwt.sign({id: userInfo._id}, 'value-app-secret', { expiresIn: '1h' });
        res.json({status:"success", message: "user found!!!", data:{user: userInfo, token:token}});
      }
      else{
        res.json({status:"error", message: "Invalid email/password!!!", data:null});
      }
    }
  });
})

app.get('/list', (req, res) => {
  db.collection('user').find({}).limit(10).toArray((err, userInfo)=>{
    if(err){
      next(err);
    } 
    else{
      res.json(userInfo);
    }
  });
})

app.get('/pagination/list/:pageNum/:pageLimit', (req, res) => {
  console.log("hiting....")
  db.collection('user').find({}).toArray((err,userInfo)=>{
    if(err){
      next(err);
    }
    else{
      let pageNumber=req.params.pageNum-1;
      let pageLimit=req.params.pageLimit;
      let low_lim=pageNumber*pageLimit;
      let upp_limit=low_lim+pageLimit;
      var arr=userInfo;
      let total_Data=arr.length;
      if(upp_limit>total_Data){
          upp_limit=total_Data
      }
      let resData=arr.slice(low_lim,upp_limit);
      let resp={
        resData:resData,
        totalRecords:total_Data
      } 
      return res.json(resp);
    }
  });
})

app.get('/users/:username', (req, res) => {
  db.collection('user').findOne({username:req.params.username},(err, userInfo)=>{
    if(err){
      next(err);
    } 
    if(!userInfo){
      res.json([]);
    }
    else{
      res.json(userInfo);
    }
  })
})

app.delete('/users/:username', (req, res) => {
  // console.log("params"+req.params.id);
  db.collection('user').deleteOne({username:req.params.username},(err, userInfo)=>{
    if(err){
      next(err);
    } 
    if(!userInfo){
      res.json([]);
    }
    else{
      res.json(userInfo);
    }
  })
})

app.put('/users/update/password/:username', (req, res) => {
  // console.log("params"+req.params.id);
  console.log("fghjk")
  db.collection('user').findOne({username:req.params.username},(err, userInfo)=>{
    if(err){
      next(err);
    } 
    if(!userInfo){
      res.json([]);
    }
    else{
      if(req.body.oldPassword==req.body.newPassword){
        return res.json({message:"oldpassword and newpassword should not be same."})
      }
      if(bcrypt.compareSync(req.body.oldPassword, userInfo.password)){
        userInfo.password=bcrypt.hashSync(req.body.newPassword,10)
        var obj={
          username    : userInfo.username,
          email       : userInfo.email,
          password    : bcrypt.hashSync(req.body.newPassword,10),
          phonenumber : userInfo.phonenumber
        }
        db.collection('user').updateOne({username:req.params.username},obj,(err, userinfo)=>{
          if(err){
            next(err);
          } 
          if(!userinfo){
            res.json({message:"no user found."});
          }
          else{
            res.json({message:"password updated."});
          }
        })
      }
      else{
        res.json({message:"old password is incorrect."});
      }
    }
  })
})

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

app.put('/users/:username', (req, res,next) => {
  // console.log("params"+req.params.id);
  db.collection('user').findOne({username:req.params.username},(err,user)=>{
    if(err){
      next(err);
    }
    if(!user){
      res.json({message:"no username found"});
    }
    else{
      if(validateEmail(req.body.email)){
        var obj={
          username    : req.body.username ? req.body.username : user.username,
          email       : req.body.email ? req.body.email : user.email,
          password    : user.password,
          phonenumber : req.body.phonenumber ? req.body.phonenumber : user.phonenumber
        }
        db.collection('user').updateOne({username:req.params.username},obj,(err, userInfo)=>{
          if(err){
            next(err);
          } 
          if(!userInfo){
            res.json({message:"no user found."});
          }
          else{
            res.json(userInfo);
          }
        })
      }
      else{
        res.json({message:"email is invalid."});
      }
    }
  })
})