const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const mysql = require("mysql");
const res = require('express/lib/response');
const axios = require("axios");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 3001;

//create database connection
const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
  port: 3306
});

function connect_db(user_id){
  let income,expenses,balance;
  conn.query("SELECT * FROM users where user_id = "+user_id, function (err, result, fields) {
    if (err) throw err;
    
    if(result.length>0){
      
      income = result[0].income;
      expenses = result[0].expenses;
      balance = result[0].balance;
    }
  });

  conn.query("SELECT * FROM balance where user_id = "+user_id, function (err, result, fields) {
    if (err) throw err;
    const b = result[result.length-1].amount;

    if(b>0){
      let sql = "UPDATE users SET income = "+(income+b) +",expenses = "+(expenses) +",balance = "+(balance+b)  +" WHERE user_id = "+user_id;
      let query = conn.query(sql,(err, results) => {
        if(err) throw err;
        console.log(results.affectedRows + " record(s) updated");
      });
    }
    else{
      let sql = "UPDATE users SET income = "+(income) +",expenses = "+(expenses-b) +",balance = "+(balance+b)  +" WHERE user_id = "+user_id;
      let query = conn.query(sql,(err, results) => {
        if(err) throw err;
        console.log(results.affectedRows + " record(s) updated");
      });
    }
  });
}

var flag = 0;

function getAccountData(res,id){
  if(flag == 0){
    conn.query("SELECT * FROM users where user_id="+id, function (err, result, fields) {
      if (err) throw err;
      
      if(result.length>0){
        
        const income = result[0].income;
        const expenses = result[0].expenses;
        const balance = result[0].balance;
        const email = result[0].email;
        const password = result[0].password;
        const id = result[0].user_id;
        const name = result[0].username;
        const data = {id:id,email:email,password:password,income:income,expenses:expenses,balance:balance,name:name};

        //send data from backend to frontend(react)
        res.send(data);
      }
    });
  }
}

function getTransactions(res,user_id){
  const history = [];
  conn.query("SELECT * FROM balance WHERE user_id = "+user_id, function (err, result, fields) {
    if (err) throw err;
    for(let i=0;i<result.length;i++){
      const a = result[i].id;
      const b = result[i].description;
      const c = result[i].amount;
      history.push({id:a,text:b,amount:c});
    }
    console.log(history);
    res.send(history);
  });
}

app.get('/', (req, res) => {
  res.send('Expense Tracker App Backend');
});

app.get('/account',(req,res)=>{
  getAccountData(res,11);
});

app.get('/transactions',(req,res)=>{
  getTransactions(res,req.query.id);
});

app.post('/register',(req,res)=>{
  let data = req.body;
  let user_id;
  data.income = 0;
  data.expenses = 0;
  data.balance = 0;

  let sql = "INSERT INTO users SET ?;";
  let query = conn.query(sql, data,(err, results) => {
    if(err) throw err;
    conn.query("SELECT * FROM users",(err,result) => {
      user_id = result[result.length-1].user_id;
      res.send({id:user_id});
    });
  });
  
});

app.post('/verify',(req,res)=>{
  let data = req.body;

  const e = data.email;
  const p = data.password;

  let sql = "SELECT * FROM users";
  let query = conn.query(sql,(err, results) => {
    if(err) throw err;
    let flag=0;
    for(let i=0;i<results.length;i++){
      const te = results[i].email;
      const tp = results[i].password;
      const tid = results[i].user_id;

      if(te==e){
        //email found now check for password
        console.log("Email found: ",e);
        flag=1;
        if(tp == p){
          console.log("User verified!");
          res.send({id:tid});
        }
        else{
          res.send({id:-1});
          console.log("Invalid credentials");
        }
        break;
      }
    }
    if(flag==0){
      res.send({id:-1});
      console.log("Email not found, invalid credentials");
    }
    
  });
  
});

app.post('/post',(req,res) =>{

    let data = req.body;
    let sql = "INSERT INTO balance SET ?;";
    let query = conn.query(sql, data,(err, results) => {
      if(err) throw err;
      res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
      connect_db(req.body.user_id);
    });
});

app.post('/delete',(req,res)=>{
  let income,expenses,balance;
  conn.query("SELECT * FROM users where user_id = "+req.body.user_id, function (err, result, fields) {
    if (err) throw err;
    
    if(result.length>0){
      
      income = result[0].income;
      expenses = result[0].expenses;
      balance = result[0].balance;
    }
  });

  let id = req.body.id;
  let user_id = req.body.user_id;
  console.log(id);
  conn.query("SELECT * FROM balance WHERE id = "+id+" and user_id = "+user_id, function (err, result, fields) {
    if (err) throw err;
    console.log(result);
    // const a = result[0].description;
    const b = result[0].amount;

    if(b>0){
      let sql = "UPDATE users SET income = "+(income-b) +",expenses = "+(expenses) +",balance = "+(balance-b)  +" WHERE user_id = "+user_id;
      let query = conn.query(sql,(err, results) => {
        if(err) throw err;
        console.log(results.affectedRows + " record(s) updated");
      });
    }
    else{
      let sql = "UPDATE users SET income = "+(income) +",expenses = "+(expenses+b) +",balance = "+(balance-b)  +" WHERE user_id = "+user_id;
      let query = conn.query(sql,(err, results) => {
        if(err) throw err;
        console.log(results.affectedRows + " record(s) updated");
      });
    }
  });

  let sql = "DELETE FROM balance WHERE id = "+id+" and user_id = "+user_id;
  let query = conn.query(sql,(err, results) => {
    if(err) throw err;
    res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
  });

  
});

app.listen(port, () => {
  console.log('Server running at port: ',port);
});

module.exports = app;