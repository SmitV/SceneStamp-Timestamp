var mysql = require('mysql');


exports.pool = mysql.createPool({
	connectionLimit: 9,
 	host: "us-cdbr-iron-east-02.cleardb.net",
 	user: "ba52740f8673f9",
 	password: "6704fa0a",
 	database: "heroku_2648a9aa380b8d4"
});
