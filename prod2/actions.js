var db = require('./database_actions');
var stub_db = require('./stub_database');
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

  get_allSeriesData(params, orig_callback){
    var baton = this._getBaton('get_allSeriesData',params, orig_callback);
    this.getAllSeriesData(baton,function(data){
      baton.callOrigCallback(data)
    });
  },
  getAllSeriesData(baton,callback){
    baton.addMethod('getAllSeriesData');
    var t = this;
		db.getAllSeriesData(baton,function(data){
      t._handleDBCall(baton, data,false/*multiple*/, callback)
    })
	},
  post_newSeries(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_newSeries',params, orig_callback);

    this._verifyParameter(baton,params.series_name, 'series', 'series_name',true /* singleValue */,function(series_name){
      params.series_name = series_name;
      getSeriesData();
    })
    
    function getSeriesData () {
      t.getAllSeriesData(baton,ensureUniqueSeriesName);
    }
    function ensureUniqueSeriesName (series_data){
      series_names = series_data.map(function(ser){return ser.series_name.toLowerCase()})
      if(series_names.includes(params.series_name.toLowerCase())){
        baton.setError(
          {
            error:"existing series name",
            series_name:params.series_name,
            public_message:'Series Name exists'
          })
        t._generateError(baton)
        return
      }
      addNewSeries(series_data);
    }
    function addNewSeries (series_data){
      var id = t._generateId(ID_LENGTH.series,series_data.map(function(series){return series.series_id}));
      db.insertSeries(baton, {'series_id':id,'series_name': params.series_name}, function(new_series){
        t._handleDBCall(baton, new_series,false/*multiple*/,function(data){
          baton.callOrigCallback(data)
        })
      })
    }
  },
  get_allEpisodeData(params, orig_callback){
    var t = this;
    var baton = this._getBaton('get_allEpisodeData',params,orig_callback);

    if(params.series_ids && params.series_ids !== undefined){
      this._verifyParameter(baton, params.series_ids, 'episode','series_id',false,function(series_ids){
        params.series_ids = series_ids;
        getEpisodeData()
      })
    }
    else{
      params.series_ids == null;
      getEpisodeData()
    }

    function getEpisodeData(){
      t.getAllEpisodeData(baton,params.series_ids,function(data){
        baton.callOrigCallback(data)
      })
    }
  },
  getAllEpisodeData(baton,series_ids, callback){
    baton.addMethod('getAllEpisodeData');
    var t = this;
    db.getAllEpisodeData(baton,series_ids,function(data){
      t._handleDBCall(baton, data,false/*multiple*/,callback)
    })
  },

  post_newEpisode(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_newEpisode',params, orig_callback);

    function ensureEpisodeIsUnique(params,callback){
      t.getAllEpisodeData(baton, [params.series_id], function(episode_data){
        if(episode_data.map(function(ep){return ep.episode_name.toLowerCase()}).includes(params.episode_name.toLowerCase())){
          baton.setError(
          {
            series_id:params.series_id,
            episode_name:params.episode_name,
            error:"Episode Name exists in series",
            public_message:'Episode Name exists in series'
          })
          t._generateError(baton)
          return
        }
        if(episode_data.filter(function(ep){return ep.season == params.season && ep.episode == params.episode}).length !== 0){
          baton.setError(
          {
            season:params.season,
            episode:params.episode,
            error:"Episode with same season and episode in series",
            public_message:'Episode with same season and episode in series'
          })
          t._generateError(baton)
          return
        }
        //update params to include generated id
        params.episode_id = t._generateId(ID_LENGTH.episode,episode_data.map(function(ep){return ep.episode_id}))
        callback()
      })
    }

    function ensureRequiredParamsPresent(params,callback){
      if(params.series_id == undefined  || params.episode_name == undefined ){
         baton.setError(
          {
            series_id:params.series_id,
            episode_name:params.episode_name,
            error:"Required params not present",
            public_message:'Required params not present'
          })
        t._generateError(baton)
        return
      }
      if((params.season || params.episode ) && (params.season == undefined  || params.episode == undefined )){
        baton.setError(
          {
            season:params.season,
            episode:params.episode,
            error:"If present, season and episode both must be present",
            public_message:'Invalid season /episode'
          })
        t._generateError(baton)
        return
      }
      t.ensure_SeriesIdExists(baton,params, function(){
        ensureEpisodeIsUnique(params, callback)
      })
    }

    function insertNewEpisode(params, callback){
      db.insertEpisode(baton,params,function(data){
        t._handleDBCall(baton, data,false/*multiple*/,callback)
      })
    }

    function verifyParams(callback){
      t._verifyMultipleParameters(baton,params, 'episode',{}/*singleValues*/, function(verified_params){
        ensureRequiredParamsPresent(verified_params,function(){
          callback(verified_params)
        })
      })
    }

    //execute
    verifyParams(function(params){
      insertNewEpisode(params, function(episode_added){
        baton.callOrigCallback(episode_added)
      })
    });
  },

  get_allCharacterData(params, orig_callback){
    var t = this;
    var baton = this._getBaton('get_allCharacterData',params,orig_callback);

    if(params.series_ids && params.series_ids !== undefined){
      this._verifyParameter(baton, params.series_ids, 'character','series_id',false,function(series_ids){
        params.series_ids = series_ids;
        getCharacterData()
      })
    }
    else{
      params.series_ids == null;
      getCharacterData()
    }

    function getCharacterData(){
      t.getAllCharacterData(baton,params.series_ids,function(data){
        baton.callOrigCallback(data)
      })
    }
  },

  getAllCharacterData(baton,series_ids, callback){
    baton.addMethod('getAllCharacterData');
    var t = this;
    db.getAllCharacterData(baton,series_ids,function(data){
      t._handleDBCall(baton, data,false/*multiple*/,callback)
    })
  },

  post_newCharacter(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_newCharacter',params, orig_callback);

    function ensureCharacterIsUnique(params,callback){
      t.getAllCharacterData(baton, [params.series_id], function(character_data){
        if(character_data.map(function(ch){return ch.character_name.toLowerCase()}).includes(params.character_name.toLowerCase())){
          baton.setError(
          {
            character_name:params.character_name,
            series_id:params.series_id,
            error:"Character Name exists in series",
            public_message:'Character Name exists in series'
          })
          t._generateError(baton)
          return
        }
        //update params to include generated id
        params.character_id = t._generateId(ID_LENGTH.character,character_data.map(function(ch){return ch.character_id}))
        callback()
      })
    }

    function ensureRequiredParamsPresent(params,callback){
      if(params.series_id == undefined || params.character_name == undefined  ){
         baton.setError(
          {
            series_id:params.series_id,
            character_name:params.character_name,
            error:"Required params not present",
            public_message:'Required params not present'
          })
        t._generateError(baton)
        return
      }
      t.ensure_SeriesIdExists(baton,params, function(){
        ensureCharacterIsUnique(params, callback)
      })
      
    }

    function verifyParams(callback){
      t._verifyMultipleParameters(baton,params, 'character',{}/*singleValues*/,function(verified_params){
        ensureRequiredParamsPresent(verified_params,function(){
          callback(verified_params)
        })
      })
    }

    function insertNewCharacter(params,callback){
      db.insertCharacter(baton,params,function(data){
        t._handleDBCall(baton, data,false/*multiple*/,callback)
      })
    }

    //execute
    verifyParams(function(params){
      insertNewCharacter(params, function(character_added){
        baton.callOrigCallback(character_added)
      })
    });

  },

  get_allCategoryData(params, orig_callback){
    var t = this;
    var baton = this._getBaton('get_allCategoryData',params,orig_callback);

    if(params.series_ids && params.series_ids !== undefined){
      this._verifyParameter(baton, params.series_ids, 'category','series_id',false,function(series_ids){
        params.series_ids = series_ids;
        getCharacterData()
      })
    }
    else{
      params.series_ids == null;
      getCategoryData()
    }

    function getCategoryData(){
      t.getAllCategoryData(baton,params.series_ids,function(data){
        baton.callOrigCallback(data)
      })
    }
  },

  getAllCategoryData(baton,series_ids, callback){
    baton.addMethod('getAllCategoryData');
    var t = this;
    db.getAllCategoryData(baton,series_ids,function(data){
      t._handleDBCall(baton, data,false/*multiple*/,callback)
    })
  },

  post_newCategory(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_newCategory',params, orig_callback);

    function ensureCategoryIsUnique(params,callback){
      t.getAllCategoryData(baton, null, function(category_data){
        if(category_data.map(function(ct){return ct.category_name.toLowerCase()}).includes(params.category_name.toLowerCase())){
          baton.setError(
          {
            category_name:params.category_name,
            error:"Category Name exists in series",
            public_message:'Category Name exists in series'
          })
          t._generateError(baton)
          return
        }
        //update params to include generated id
        params.category_id = t._generateId(ID_LENGTH.category,category_data.map(function(ct){return ct.category_id}))
        callback()
      })
    }

    function ensureRequiredParamsPresent(params,callback){
      if(params.category_name == undefined  ){
         baton.setError(
          {
            category_name:params.category_name,
            error:"Required params not present",
            public_message:'Required params not present'
          })
        t._generateError(baton)
        return
      }
      ensureCategoryIsUnique(params, callback)      
    }

    function verifyParams(callback){
      t._verifyMultipleParameters(baton,params, 'category',{}/*singleValues*/,function(verified_params){
        ensureRequiredParamsPresent(verified_params,function(){
          callback(verified_params)
        })
      })
    }

    function insertNewCategory(params,callback){
      db.insertCategory(baton,params,function(data){
        t._handleDBCall(baton, data,false/*multiple*/,callback)
      })
    }

    //execute
    verifyParams(function(params){
      insertNewCategory(params, function(character_added){
        baton.callOrigCallback(character_added)
      })
    });
  },

  get_allTimestampData(params, orig_callback){
    var t = this;
    var baton = this._getBaton('get_allTimestampData',params,orig_callback);

      t._verifyMultipleParameters(baton,params, 'timestamp',{character_ids:false,category_ids:false,episode_ids:false }/*singleValues*/,function(verified_params){
        getTimestampData(verified_params)
      })

    function getTimestampData(params){
      t.getAllTimestampData(baton,params,function(data){
        baton.callOrigCallback(data)
      })
    }
  },

  //get character and categories for timestamps
  getAllTimestampData(baton,params, callback){
    baton.addMethod('getAllTimestampData');
    var t = this;

    db.getAllTimestampData(baton,params.episode_ids,params.timestamp_ids,function(data){
      t._handleDBCall(baton, data,false/*multiple*/,function(timestamp_data){
        dataLoader(timestamp_data, function(results){
          if(params.character_ids){
            timestamp_data = timestamp_data.filter(function(timestamp){return t._intersection(params.character_ids, timestamp.characters).length >0});
          }
          if(params.category_ids){
            timestamp_data = timestamp_data.filter(function(timestamp){return t._intersection(params.category_ids, timestamp.categories).length >0});
          }
         callback(timestamp_data)

        })
      })
    })


    function dataLoader(timestamp_data,suc_callback){
      var timestamp_ids = timestamp_data.map(function(timestamp){return timestamp.timestamp_id})
      var tasks = {}
      tasks.allCategory = function(callback){
        db.getAllTimestampCategory(baton,(timestamp_ids.length == 0 ? {} :{timestamp_ids: timestamp_ids}),function(data){
          t._handleDBCall(baton, data,true/*multiple*/,callback)
        })
      }
      tasks.allCharacter= function(callback){
        db.getAllTimestampCharacter(baton,(timestamp_ids.length == 0 ? {} :{timestamp_ids: timestamp_ids}),function(data){
          t._handleDBCall(baton, data,true/*multiple*/,callback)
        })
      }

      async.parallel(tasks,
        function(err, results){
          if(err){
            t._generateError(baton);
            return
          }
          else{ 
            suc_callback(timestamp_data.forEach(function(timestamp){
               timestamp.characters = results.allCharacter.filter(function(ch){return ch.timestamp_id == timestamp.timestamp_id}).map(function(ch){return ch.character_id});
               timestamp.categories = results.allCategory.filter(function(ct){return ct.timestamp_id == timestamp.timestamp_id}).map(function(ct){return ct.category_id});
            }))    
          }
        });
      }
   
  },

  post_newTimestamp(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_newTimestamp',params, orig_callback);

    function createTimestampId(params,callback){
      t.getAllTimestampData(baton, {},function(timestamp_data){
        params.timestamp_id = t._generateId(ID_LENGTH.timestamp, timestamp_data.map(function(ts){return ts.timestamp_id}))
        callback(params)
      })
    }


    function ensureRequiredParamsPresent(params,callback){
      if(params.start_time == undefined || params.episode_id == undefined  ){
         baton.setError(
          {
            episode_id:params.episode_id,
            start_time:params.start_time,
            error:"Required params not present",
            public_message:'Required params not present'
          })
        t._generateError(baton)
        return
      }
      createTimestampId(params, callback)  
    }

    function verifyParams(callback){
      
      t._verifyMultipleParameters(baton,params, 'timestamp',{}/*singleValues*/,function(verified_params){
        t.ensure_EpisodeIdExists(baton,verified_params, function(){
          ensureRequiredParamsPresent(verified_params,callback)
        })
      })
    }

    function insertNewTimestamp(params,callback){
      db.insertTimestamp(baton,params,function(data){
        t._handleDBCall(baton, data,false/*multiple*/,callback)
      })
    }

    //execute
    verifyParams(function(params){
      insertNewTimestamp(params, function(timestamp_data){
        baton.callOrigCallback(timestamp_data)
      })
    });
  },

  post_updateTimestamp(params, orig_callback){
    var t = this;
    var baton = this._getBaton('post_updateTimestamp',params, orig_callback);

    function addCharactersAndCategories(params, suc_callback){
      var tasks = {}
      if(params.category_ids){
        tasks.categories = function(callback){
          var category_values = [];
          params.category_ids.forEach(function(category){
            category_values.push([params.timestamp_id[0], category]);
          })
          db.insertTimestampCategory(baton,category_values,function(data){
            t._handleDBCall(baton, data,true/*multiple*/, callback)
          })
        }
      }
      if(params.character_ids){
        tasks.characters = function(callback){
          var character_values = [];
          params.character_ids.forEach(function(character){
            character_values.push([params.timestamp_id[0], character]);
          })
          db.insertTimestampCharacter(baton,character_values,function(data){
            t._handleDBCall(baton, data,true/*multiple*/, callback)
          })
        }
      }
      
      async.parallel(tasks,
      function(err, results){
        if(err){
          t._generateError(baton);
          return
        }
        else{
          suc_callback()
        }
      });
    }

    function removeCharactersAndCategories(params, suc_callback){
      function createTasks(after_task_created_callback){
        var tasks = {}
        if(params.category_ids || params.clearCategories){
          tasks.categories = function(callback){
            db.removeTimestampCategory(baton,params.timestamp_id,function(data){
              t._handleDBCall(baton, data,true/*multiple*/, callback)
            })
          }
        }
        if(params.character_ids || params.clearCharacters){
          tasks.characters = function(callback){
            db.removeTimestampCharacter(baton,params.timestamp_id,function(data){
              t._handleDBCall(baton, data,true/*multiple*/, callback)
            })
          }
        }
        after_task_created_callback(tasks)
      }

      createTasks(function(tasks){
        async.parallel(tasks,
          function(err, results){
            if(err){
              t._generateError(baton);
              return
            }
            else{
              suc_callback()
            }
        });
      })
    }

    function ensureRequiredParamsPresent(params,callback){
      if(params.timestamp_id == undefined){
         baton.setError(
          {
            character_ids:params.character_ids,
            category_ids:params.category_ids,
            timesamp_id:params.timestamp_id,
            error:"Required params not present",
            public_message:'Required params not present'
          })
        t._generateError(baton)
        return
      }
      t.ensure_TimestampIdExists(baton,params, callback)  
    }

    function ensureCharactersFromSameSeries(characters, timestamp, callback){
      t.ensure_EpisodeIdExists(baton, {episode_id : timestamp.episode_id}, function(episode){
        episode = episode[0]
        t.getAllCharacterData(baton, [episode.series_id], function(series_characters){
          if(t._intersection(characters,series_characters.map(function(character){return character.character_id})).length !== characters.length){
            baton.setError(
            {
              character_ids:params.character_ids,
              series_id:episode.series_id,
              timesamp_id:params.timestamp_id,
              error:"Not all characters in series",
              public_message:'Invalid characters'
            })
          t._generateError(baton)
          return
          }
          callback()
        })
      })
    }

     function verifyParams(callback){
      t._verifyMultipleParameters(baton,params, 'timestamp',{character_ids:false, category_ids:false,timestamp_id:false}/*singleValue*/,function(verified_params){
        ensureRequiredParamsPresent(verified_params, function(timestamp_data){
          if(verified_params.character_ids){
            ensureCharactersFromSameSeries(verified_params.character_ids, timestamp_data[0], function(){
              callback(verified_params)
            })
            return
          }
          callback(verified_params) 
        })
      })
    }

    verifyParams(function(params){
      //IF NEEDED, add check for if the characters are in the series
      removeCharactersAndCategories(params,function(){
        addCharactersAndCategories(params,function(){
          baton.callOrigCallback(params)
        })
       })
    })


  },



  ensure_SeriesIdExists(baton, params, callback){
    var t = this;
    baton.addMethod('ensure_SeriesIdExists');
    this.getAllSeriesData(baton,function(series_data){
      if(!series_data.map(function(ser){return ser.series_id}).includes(params.series_id)){
        baton.setError(
        {
          series_id:params.series_id,
          error:"Series id not registered",
          public_message:'Invalid Series Id'
        })
      t._generateError(baton)
      return
      }
      callback()
    })
  },

  ensure_EpisodeIdExists(baton, params, callback){
    var t = this;
    baton.addMethod('ensure_EpisodeIdExists');
    this.getAllEpisodeData(baton,null/*series_id*/,function(episode_data){
      if(!episode_data.map(function(ep){return ep.episode_id}).includes(params.episode_id)){
        baton.setError(
        {
          episode_id:params.episode_id,
          error:"Episode id not registered",
          public_message:'Invalid Episode Id'
        })
      t._generateError(baton)
      return
      }
      callback(episode_data.filter(function(ep){return ep.episode_id == params.episode_id}))
    })
  },

  ensure_TimestampIdExists(baton, params, callback){
    var t = this;
    baton.addMethod('ensure_EpisodeIdExists');
    this.getAllTimestampData(baton,{timestamp_ids : params.timestamp_id}, function(timestamp_data){
      if(timestamp_data.length !== params.timestamp_id.length){
        baton.setError(
        {
          timestamp_id:params.timestamp_id,
          error:"Timestamp id not registered",
          public_message:'Invalid Timestamp Id'
        })
      t._generateError(baton)
      return
      }
      callback(timestamp_data)
    })
  },


  /**
   * Will run verification for multiple parameters 
   * use will be to verify params for episode/timestamp/object in post requests
   */
  _verifyMultipleParameters(baton, valuesAndAttr, table,singleValues, suc_callback){
    var t = this;
    var params = {}

    Object.keys(valuesAndAttr).forEach(function(paramKey){
      if(Object.keys(db.TABLES[table]).includes(paramKey) && valuesAndAttr[paramKey] !== '') params[paramKey] = valuesAndAttr[paramKey] 
    })
    
    var createTasks = function(){
      var tasks;
      createVerifyWith(function(t){
        return tasks = t
      })
      return tasks
    }
    var createVerifyWith = function(suc_callback){
      var tasks = {};
      Object.keys(params).forEach(function(key){
        //each value will have string passed and if singleValue is required
        tasks[key] = function(callback){
          t._verifyParameter(baton, params[key], table, key,(singleValues[key] !== undefined ?singleValues[key]:true ) /* singleValue */,callback,true/*multipleVerification*/)};
      })
      suc_callback(tasks)
    }
    async.parallel(createTasks(),
      function(err, results){
        if(err){
          baton.setError(err)
          t._generateError(baton);
          return
        }
        else{
          suc_callback(results)
        }
      });
  },
  /**
   * Will verify if the parameters passed in request is correct type
   * @param {[]} value array of parameters that needs to be checked
   * @param {string} attr the type of variable the value array must be
   * @param {string} table the corresponding table defined in database
  */
  _verifyParameter(baton, value, table, attr,singleValue,callback, multipleVerification){
    var t = this;

    if(!Array.isArray(value)) value = this._stringToArray(value)

    var errorPresent = false;

    var throwError = function(val,msg){
      errorPresent = true;
      var error = {
              error:"verification parameter",
              value:val,
              attribute : attr,
              public_message : (msg ? msg : 'Invalid value for '+attr)
      };
      if(!multipleVerification){
        baton.setError(error);
        t._generateError(baton);
        return
      }
      callback(error)

    };

    var returnBasedOnMultiple = function(data){
      if(multipleVerification){
        callback(null, data)
        return
      }
      callback(data)
    }

    //in case : attribute can only be one value (or nothing, for optional values)
    //methods calling verification will check for required values
    if(singleValue && value.length > 1) {
      throwError(value.toString(),attr + ' should be single value')
      return 
    }
    //check each value type
    value.forEach(function(val){
      if(db.TABLES[table][attr] == 'number'){
        if(isNaN(parseInt(val))){
          throwError(val) 
          return 
        }
        else{
          value[value.indexOf(val)] = parseInt(val)
        }
      }
      else if(db.TABLES[table][attr] == 'boolean'){
        if(val != 'true' & val != 'false'){
          throwError(val) 
          return 
        }
      }
      else if(typeof val !== db.TABLES[table][attr]){
        throwError(val);
        return 
      }
    })

    if(!errorPresent) {
      if(singleValue){
        returnBasedOnMultiple(value[0])
        return
      }
      returnBasedOnMultiple(value)
    }
  },
  _stringToArray(str,toInt){
    if(str == undefined) return [undefined]
    str = str.split(',')
    if(toInt) str.map(function(s){return parseInt(s)})
    return str
  },
  /**
   * Handles if error occurs from DB Call
   * in case of multiple, callback will be error,results
   */
  _handleDBCall(baton, data,multiple, callback){
    if(data == null){
      //the error would have been set on the DB side
      if(multiple){
        callback(true)
        return 
       }
      //the error would have been set on the DB side
      this._generateError(baton)
      return
    }
    if(multiple){
      callback(null, data)
      return
    }
    callback(data)
  },
  /**
   * Creates the 'baton' object holding all general info for the session functions
   * Original Callback will be stored, and method sequence will be stored, along with error
   * uses 'call-by-sharing' ; like call-by-reference, but only for properties of objects
   */
  _getBaton(method, params, orig_callback){
    var time = new Date();
    return {
      //id to reference detail log
      id:this._generateId(10),
      start_time:time.getTime(),
      err :[],
      //the original callback set in 'post' / 'get' endpoint calls
      orig_callback: orig_callback,
      //sets the stub for the database
      use_stub_database:(params.stub_database ? params.stub_database : false),
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
      setError:function(error){
        var end_time = new Date()
        this.duration = end_time.getTime() - this.start_time
        this.err.push(error);
      }
    }
  },

  _makeDbCall(baton, call, ...params){
    if(baton.use_stub_database){
      db[call](params)
    }
    else{
      stub_db[call](params)
    }
  },
  _generateError(baton){
    console.log('----------------')
    console.log(baton)
    console.log()
		var response = {
      'id':baton.id,
      'error_message':baton.err.map(function(err){return err.public_message}).join('.'),
      'method_seq':baton.methods
    };
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
  /**
   * Returns the intersection of two arrays
   */
  _intersection(a, b){
    c = [...a.sort()];
    d = [...b.sort()];
    var result = [];
    while( c.length >0 && d.length >0 )
    {
        if      (c[0] < d[0] ){ c.shift(); }
        else if (c[0] > d[0] ){ d.shift(); }
        else /* they're equal */
        {
           result.push(c.shift());
           d.shift();
        }
    }
    return result;
  },

}
