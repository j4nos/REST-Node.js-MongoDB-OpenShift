  var http = require('http');
  var express = require('express');
  var app = express();
  var mongodb = require("mongodb");
  var connection = require('./connection');
  var bson = require("bson");
  var BSON = bson.BSONPure; //

  app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
  app.set('ip', process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');
  app.use(express.bodyParser());

  var connection_string = 'mongodb://127.0.0.1:27017/nodejs';
  // if OPENSHIFT env variables are present, use the available connection info:
  if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){
    connection_string = 'mongodb://' + process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
    process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
    process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
    process.env.OPENSHIFT_MONGODB_DB_PORT;
  }

  http.createServer(app).listen(app.get('port'), app.get('ip'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });

  app.get('/:db/:collection/:id?', function (req, res) {

    var query = req.query.query ? JSON.parse(req.query.query) : {};

    if (req.params.id) {
      query = {'_id': new BSON.ObjectID(req.params.id)};
    }
    var options = req.params.options || {};

    var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout'];

    for( o in req.query ) {
      if( test.indexOf(o) >= 0 ) {
        options[o] = req.query[o];
      } 
    }

    connection.connect(connection_string + '/' + req.params.db + '?authSource=admin', function (err, db) {

      if (err) {

        console.log('Db open error: ' + err.message);
        res.status(500).json({ message: 'Server error' });
        return;
      }

      db.collection(req.params.collection, function(err, collection) {
        if (err) {
          //logger.error('Error getting collection ' + collection + ': ' + err.message);
          res.status(500).json({ message: 'Server error' });
          return;
        }

        collection.find(query, options, function(err, cursor) {
          if (err) {
            //logger.error('Error finding document(s): ' + err.message);
            res.status(500).json({ message: 'Server error' });
            return;
          }

          cursor.toArray(function(err, docs){
            if (err) {
              //logger.error('Error getting database cursor as array: ' + err.message);
              res.status(500).json({ message: 'Server error' });
              return;
            } 

            var result = [];          
            if(req.params.id) {
              if(docs.length > 0) {
                result = docs[0];
                res.json(result);
              } else {
                res.status(404).json({ ok: 0 });
              }
            } else {
              docs.forEach(function(doc) {
                result.push(doc);
              });
              res["json"](result);
            }
          });
        });
      });
    });
  });

  app.put('/:db/:collection/:id', function(req, res) {
    var spec = {'_id': new BSON.ObjectID(req.params.id)};

        connection.connect(connection_string + '/' + req.params.db + '?authSource=admin', function (err, db) {

      if (err) {
        //logger.error('Db open error: ' + err.message);
        res.status(500).json({ message: 'Server error' });
        return;
      }

      db.collection(req.params.collection, function(err, collection) {
        if (err) {
          //logger.error('Error getting collection ' + collection + ': ' + err.message);
          res.status(500).json({ message: 'Server error' });
          return;
        }

        collection.update(spec, req.body, true, function(err, docs) {
          res.json({ ok: 1 });
        });
      });
    });
  });

  app.post('/:db/:collection', function(req, res) {

   if(req.body) {

     console.log(connection_string + '/' + req.params.db + '?authSource=admin');

     connection.connect(connection_string + '/' + req.params.db + '?authSource=admin', function (err, db) {

      if (err) {

        console.log('Db open error: ' + err.message);
        res.status(500).json({ message: 'Server error' });
        return;
      }

      db.collection(req.params.collection, function(err, collection) {
        if (err) {
          console.log('Error getting collection ' + collection + ': ' + err.message);
          res.status(500).json({ message: 'Server error' });
          return;
        }

        collection.insert(
          Array.isArray(req.body) ? req.body[0] : req.body,
          function(err, docs) {
            if (err) {

              console.log('Error inserting into collection ' + collection + ': ' + err.message);
              res.status(500).json({ message: 'Server error' });
              return;
            }

            res.header('Content-Type', 'application/json');
            res.status(201).json({ message: 'ok' });
          }
          );
      });
    });
   } else {
     res.json({ ok: 1 });
   }
 });

  app.delete('/:db/:collection/:id', function(req, res) {
    var spec = {'_id': new BSON.ObjectID(req.params.id)};

    connection.connect(connection_string + '/' + req.params.db + '?authSource=admin', function (err, db) {

      if (err) {
        //logger.error('Db open error: ' + err.message);
        res.status(500).json({ message: 'Server error' });
        return;
      }

      db.collection(req.params.collection, function(err, collection) {
        if (err) {
          //logger.error('Error getting collection ' + collection + ': ' + err.message);
          res.status(500).json({ message: 'Server error' });
          return;
        }

        collection.remove(spec, function(err, docs) {
          if (err) {
            //logger.error('Error removing from ' + collection + ': ' + err.message);
            res.status(500).json({ message: 'Server error' });
            return;
          }
          res.json({ ok: 1 });
        });
      });
    });
  });