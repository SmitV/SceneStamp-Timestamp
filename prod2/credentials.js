var mysql = require('mysql');


var MAIN_POOLS = {
	pool: mysql.createPool({
		connectionLimit: 9,
		host: "us-cdbr-iron-east-02.cleardb.net",
		user: "ba52740f8673f9",
		password: "6704fa0a",
		database: "heroku_2648a9aa380b8d4"
	}),
	user_pool: mysql.createPool({
		connectionLimit: 9,
		host: "us-cdbr-iron-east-02.cleardb.net",
		user: "ba52740f8673f9",
		password: "6704fa0a",
		database: "heroku_2648a9aa380b8d4"
	})
}
var VIDEO_SERVER_URL = 'http://ubuntu@ec2-18-221-3-92.us-east-2.compute.amazonaws.com'
var VIDEO_SERVER_PORT = 8081

var pools = MAIN_POOLS


module.exports = {

	// above for testing only
	pools: pools,
	pool: pools.pool,
	user_pool: pools.user_pool,
	VIDEO_SERVER_URL: VIDEO_SERVER_URL,
	VIDEO_SERVER_PORT: VIDEO_SERVER_PORT

}