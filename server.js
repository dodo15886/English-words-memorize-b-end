const express = require("express");
const mysql = require("mysql");
const moment = require("moment");
const bodyParser = require("body-parser");
const app = express();

// const conn = mysql.createConnection({
//   // 创建mysql实例
//   host: "us-cdbr-iron-east-01.cleardb.net",
//   port: "3306",
//   user: "bb487ddf5be294",
//   password: "6a4d8484",
//   database: "heroku_25f0309602332ab"
// });

const conn = mysql.createConnection({
    // 创建mysql实例
    host: "127.0.0.1",
    port: "3306",
    user: "root",
    password: "lalala15886",
    database: "wordsDatabase"
  });

app.use(function (req, res, next) {
  // 解決跨域
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
}));

// GET:QUERY, POST: BODY
app.post("/login", function (req, res) {
  // 一般的登入
  let personId = req.body.openId;
  let personName = req.body.name;

  let seekUserSQL = `SELECT * FROM user WHERE openId = "${personId}";`;
  // 從db找看傳進來的id存不存在

  conn.query(seekUserSQL, (err, result) => {
    // result is an array and compose with object like : [ RowDataPacket{...} ]
    // 所以result[0]裡才是seek到的user

    if (err) throw err;

    if (result.length) {
      // id已存在

      let date = result[0].lastLoginDate;
      let count = result[0].loginCount;
      let curDate = moment().format("YYYY-MM-DD");

      if (date != curDate) {
        // 如果上次登入不是在今天
        count++; // 登入天數+1
        date = curDate; // 把上次登入的日期改為今天
        let countLoginDateSQL = `UPDATE user SET lastLoginDate="${date}",
          loginCount=${count} WHERE openId="${personId}";`;
        // 把次數跟日期從database更新

        conn.query(countLoginDateSQL, (err, result) => {
          if (err) throw err;
        });
      }

      res.send(true); // login成功
    } else {
      // id不存在
      res.send(false); // login失敗
    }
  });
});

app.post("/wechatLogin", function (req, res) {
  let personId = req.body.openId;
  let personName = req.body.name;

  var seekUserSQL = `SELECT * FROM user WHERE openId = "${personId}";`;
  // 從db找看傳進來的id存不存在

  conn.query(seekUserSQL, (err, result) => {
    if (err) throw err;
    console.log(result);
    if (result.length) {
      let date = result[0].lastLoginDate;
      let count = result[0].loginCount;
      let curDate = moment().format("YYYY-MM-DD");

      if (date != curDate) {
        // 如果上次登入不是在今天
        count++; // 登入天數+1
        date = curDate; // 把上次登入的日期改為今天
        let countLoginDateSQL = `UPDATE user SET lastLoginDate="${date}",
          loginCount=${count} WHERE openId="${personId}";`;
        // 把次數跟日期從database更新

        conn.query(countLoginDateSQL, (err, result) => {
          if (err) throw err;
        });
      }
      res.send(true); // login成功
    } else {
      // id不存在
      addUser(personId, personName, (err, isAdd) => {
        // 因為是微信隨機產生的openId，假如傳過來openId不在就直接當作註冊然後登入
        if (err) throw err;
        if (isAdd) {
          // 註冊成功的話
          let curDate = moment().format("YYYY-MM-DD");
          let countLoginDateSQL = `UPDATE user SET lastLoginDate="${curDate}",
          loginCount=1 WHERE openId="${personId}";`;
          // 把次數跟日期從database更新
          conn.query(countLoginDateSQL, (err, result) => {
            if (err) throw err;
          });
          res.send(true);
        }
      });
    }
  });
});

app.post("/rawLoad", function (req, res) {
  let rawLoadSQL = `SELECT * FROM target`;
  conn.query(rawLoadSQL, (err, result) => {
    res.send(result);
  });
});

app.post("/load", function (req, res) {
  let personName = req.body.name;
  let personId = req.body.openId;
  let personWholeData;
  let readTargetSQL = `SELECT * FROM target;`;
  // 把raw的單字庫都讀出來(有中文、音標、例句等資料)

  conn.query(readTargetSQL, (err, wholeData) => {
    personWholeData = wholeData; // 創一個新的變數去做操作

    for (let i = 0; i < personWholeData.length; i++) {
      // 一圈用一個單字id去找他在raw庫裡的對應的單字
      let readUserSQL = `SELECT * FROM ${personId} WHERE id = "${
        personWholeData[i].id
      }";`;

      conn.query(readUserSQL, (err, userData) => {
        if (err) throw err;
        personWholeData[i].cannotMemoryCount = userData[0].cannotMemoryCount;
        // 把user的紀錄做更新(count)

        if (i == personWholeData.length - 1) {
          // 如果更新完最後一個後
          let readLoginDateSQL = `SELECT loginCount FROM user WHERE openId = "${personId}"`;
          // 要把登入次數讀出來
          conn.query(readLoginDateSQL, (err, result) => {
            personWholeData = [personWholeData, result[0].loginCount];
            res.send(personWholeData); // 把更新完的user單字庫傳回給client做顯示
          });
        }
      });
    }
  });
});

app.post("/reset", function (req, res) {
  let personName = req.body.name;
  let personId = req.body.openId;
  let resetUserDataSQL = `UPDATE ${personId} SET cannotMemoryCount=0`;

  conn.query(resetUserDataSQL, (err, result) => {
    if (err) throw err;
    res.send("Reset successfully.");
  });
});

app.post("/count", function (req, res) {
  // req.body[0]: count, [1]: id, [2]: curUserInfo

  let personId = req.body[2].openId;
  let personName = req.body[2].name;

  let updateCountSQL = `UPDATE ${personId} SET cannotMemoryCount=${
    req.body[0]
  } WHERE id=${req.body[1]}`;
  // 把目前單字的count做更新

  conn.query(updateCountSQL, (err, result) => {
    if (err) throw err;
    res.send("ok");
  });
});

app.post("/register", function (req, res) {
  let personName = req.body.name;
  let personId = req.body.openId;

  var sql = `SELECT * FROM user WHERE openId = "${personId}";`;
  // 找這個id有沒有在user庫裡（有沒有註冊過）

  conn.query(sql, (err, result) => {
    if (err) throw err;

    if (result.length) {
      // 已經註冊過了
      res.send(false);
    } else {
      // 沒註冊過
      addUser(personId, personName, (err, isAdd) => {
        // 加進user庫裡
        if (err) throw err;

        if (isAdd) {
          // 註冊成功
          res.send(true);
        } else {
          console.log("沒註冊過，但新增進資料庫的過程失敗。");
          res.send(false);
        }
      });
    }
  });
});

function addUser(personId, personName, callback) {
  let insertSQL = `INSERT INTO USER (name, openId, lastLoginDate, loginCount) VALUE("${personName}", "${personId}", "", 0);`;
  // 把新的user加進user庫
  let createUserDataSQL = `CREATE TABLE ${personId} AS(SELECT cannotMemoryCount, id FROM target);`;
  // 新創一個屬於那個user的database，裡面有他作答每個單字的id跟count（對那單字的熟悉度）

  conn.query(insertSQL, (err, result) => {
    // 先加進user庫
    if (err) throw err;

    conn.query(createUserDataSQL, (err, result) => {
      // 再創database
      if (err) throw err;
      callback(err, true);
    });
  });
}

module.exports = app;