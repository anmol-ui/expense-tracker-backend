const express = require('express');
const mysql = require("mysql");
const bodyParser = require('body-parser');
const cors = require("cors");
const axios = require('axios');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 4000;

//create database connection
const conn = mysql.createConnection({
  host: "expensetracker.cb25oh1sd7ed.eu-north-1.rds.amazonaws.com",
  user: "root",
  password: "Anmol123#",
  database: "expensetracker",
  port: 3306
});


conn.connect(function(err) {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  
  console.log('Connected to database.');
});

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
      history.push({id:a,description:b,amount:c});
    }
    res.send(history);
  });
}

app.get('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.send('Expense Tracker App Backend');
});
app.get('/account',(req,res)=>{
  getAccountData(res,req.query.id);
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
    console.log(data);
    const income = ((data.income));
    const balance = ((data.balance));
    const expenses = ((data.expenses));
    const user_id = data.user_id;
    const transactions = data.transactions;

    let sql = "UPDATE users SET income = "+income+", balance = "+balance+", expenses = "+expenses+" WHERE user_id = "+user_id;
    let query = conn.query(sql,(err, results) => {
      if(err) throw err;
      // res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
    });


    sql = "DELETE FROM balance WHERE user_id = "+user_id+";";
    conn.query(sql,(err, results) => {
      if(err) throw err;
    });

    for(let i=0;i<transactions.length;i++){
      const transaction = transactions[i];
      const desc = transaction.description;
      const amount = parseFloat(String(transaction.amount)).toFixed(2);
      const id = i;
      sql = "REPLACE INTO balance (id, description, amount,user_id) VALUES ("+id+","+'"'+desc+'"'+","+amount+","+user_id+");"
      conn.query(sql,(err, results) => {
        if(err) throw err;
      });
    }
    // res.send(JSON.stringify({"status": 200, "error": null, "response": results}));
    
});

//-----------------------------------------FETCH STOCK MARKET DATA---------------------------------------------
const symbols = ['INFY.BSE','RELIANCE.BSE','IBM','HDFC.BSE','TCS.BSE','HCLTECH.BSE','ITC.BSE','ADANIENT.BSE','TATAMOTORS.BSE','PAYTM.BSE'];

const fetchData = async (sym) => {
  try {
    const response = await axios.get(
      'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol='+sym+'&apikey=3NC5FRPGCGU5YIV3'
    ); // Replace YOUR_API_KEY with your actual API key

    if (response.status !== 200) {
      throw new Error('Error fetching stock data');
    }

    const data = response.data;
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const fetchStockData = async () => {
  for (let i = 0; i < 10; i++) {
    const stockData = await fetchData(symbols[i]);
    console.log(stockData)
    if (stockData) {
      const symbol = stockData['Global Quote']['01. symbol'];
      const lastPrice = stockData['Global Quote']['05. price'];
      const change = stockData['Global Quote']['09. change'];
      const changePercent = stockData['Global Quote']['10. change percent'];

      console.log(`Stock Data - Iteration ${i + 1}`);
      console.log(`Symbol: ${symbol}`);
      console.log(`Last Price: ${lastPrice}`);
      console.log(`Change: ${change}`)
      console.log(`Change Percent: ${changePercent}`);
      console.log('----------------------');

      const sql = "REPLACE INTO stock_data VALUES ("+'"'+symbol+'"'+","+lastPrice+","+change+","+'"'+changePercent+'"'+");"
      conn.query(sql,(err, results) => {
        if(err) throw err;
      });
    }

    await new Promise(resolve => setTimeout(resolve, 20000)); // Pause for 20 seconds between each api call
  }
};

function sql_stocks_data(res){
  let sql = "SELECT * FROM stock_data";
  conn.query(sql,(err, results) => {
    res.send(results);
  });
}


app.get('/update_stocks',(req,res)=>{
  fetchStockData();
  res.send('Updating ...');
});

app.get('/fetch_stocks_data',(req,res)=>{
  sql_stocks_data(res);
})

app.listen(port, () => {
  console.log('Server running at port: ',port);
});

module.exports = app;