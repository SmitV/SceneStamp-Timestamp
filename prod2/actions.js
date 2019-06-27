var db = require('./database_actions');
var async = require('async');


/**

GENERAL DESIGN

Private functions : start with '_'
Direct API functions : start with 'post' or 'get'
  -All such calls will create and pass the 'baton' to following functions
*/


var ID_LENGTH = {
	'series': 5,
	'episode': 6,
	'character':7,
	'timestamp': 9,
	'category':5
}

module.exports = {

  get_allSeriesData(orig_callback){
    var baton = this._getBaton('get_allSeriesData',orig_callback);
    this.getAllSeriesData(baton,function(){
      baton.callOrigCallback()
    });
  },
  getAllSeriesData(baton,callback){
    baton.addMethod('getAllSeriesData');
    var t = this;
		db.getAllSeriesData(baton,function(data){
      t._handleDBCall(baton, data,callback)
    })
	},
  post_newSeries(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_newSeries',orig_callback);

    this._verifyParameter(baton,params.series_name, 'series', 'series_name',getSeriesData)

    function getSeriesData () {
      t.getAllSeriesData(baton,ensureUniqueSeriesName);
    }
    function ensureUniqueSeriesName (series_data){
      series_names = series_data.map(function(ser){return ser.series_name.toLowerCase()})
      if(series_names.includes(params.series_name.toLowerCase())){
        baton.setError(
          {
            error:"existing series name",
            series_name:params.series_name
          },'Series Name exists')
        t._generateError(baton)
        return
      }
      addNewSeries(series_data);
    }

    function addNewSeries (series_data){
      var id = t._generateId(ID_LENGTH.series,series_data.map(function(series){return series.series_id}));
      db.insertSeries(baton, {'series_id':id,'series_name': params.series_name}, function(new_series){
        t._handleDBCall(baton, new_series,function(data){
          baton.callOrigCallback(data)
        })
      })
    }
  },
  _verifyParameter(baton, value, table, attr,callback){
    console.log(db.TABLES[table][attr])
    if(typeof value !== db.TABLES[table][attr]){
      baton.setError(
        {
          error:"verification parameter",
          value:value,
          attribute : attr
        },'Invalid value for  '+attr)
      this._generateError(baton)
      return
    }
    callback()
  },
  /**
   * Handles if error occurs from DB Call
   */
  _handleDBCall(baton, data,callback){
    if(data == null){
      //the error would have been set on the DB side
      this._generateError(baton)
      return
    }
    callback(data)
  },
  /**
   * Creates the 'baton' object holding all general info for the session functions
   * Original Callback will be stored, and method sequence will be stored, along with error
   * uses 'call-by-sharing' ; like call-by-reference, but only for properties of objects
   */
  _getBaton(method, orig_callback){
    var time = new Date();
    return {
      //id to reference detail log
      id:this._generateId(10),
      start_time:time.getTime(),
      //the original callback set in 'post' / 'get' endpoint calls
      orig_callback:orig_callback,
      callOrigCallback: function(data){
        var end_time = new Date()
        this.duration = end_time.getTime() - this.start_time
        console.log(this.methods[0] + " | "+ this.duration )
        this.orig_callback(data)
      },
      //method sequence
      methods:[method],
      addMethod:function(meth){
        this.methods.push(meth)
      },
      //the error object & public message to display
      setError:function(err,public_message){
        var end_time = new Date()
        this.duration = end_time.getTime() - this.start_time
        this.err = err;
        this.public_message = public_message;
      }
    }
  },
  _generateError(baton){
		var response = {
      'id':baton.id,
      'error_message':baton.public_message,
      'method_seq':baton.methods
    };
    console.log(baton)
    baton.orig_callback(response)
  },
  _generateId(length, ids){
		var id= (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
			if(ids){
				while( ids.includes(id)){
				id= (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
			}
		}
		return id;
	},

}
