(function() {
  var ImageModel, Skull, TodoModel, UserSetting, UserSettings, express, io, _;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  Skull = require('../../lib/skull-server');
  io = require('socket.io');
  _ = require('underscore');
  express = require('express');
  TodoModel = (function() {
    __extends(TodoModel, Skull.Model);
    TodoModel.prototype.name = '/todos';
    function TodoModel() {
      this.todos = {};
      this.id = 1445;
      TodoModel.__super__.constructor.apply(this, arguments);
    }
    TodoModel.prototype.create = function(data, callback, socket) {
      data.id = this.id++;
      this.todos[data.id] = data;
      callback(null, data);
      return this.emit('create', data, socket);
    };
    TodoModel.prototype.update = function(data, callback, socket) {
      var existing;
      existing = this.todos[data.id];
      if (!existing) {
        return callback("item doesn't exist");
      }
      this.todos[data.id] = data;
      callback(null, data);
      return this.emit('update', data, socket);
    };
    TodoModel.prototype["delete"] = function(data, callback, socket) {
      var existing;
      existing = this.todos[data.id];
      if (!existing) {
        return callback("item doesn't exist");
      }
      delete this.todos[data.id];
      callback(null, data);
      return this.emit('delete', data, socket);
    };
    TodoModel.prototype.read = function(filter, callback, socket) {
      var items;
      items = _.toArray(this.todos);
      console.dir(items);
      return callback(null, items);
    };
    return TodoModel;
  })();
  ImageModel = (function() {
    __extends(ImageModel, Skull.Model);
    ImageModel.prototype.name = '/image';
    function ImageModel() {
      this.url = 'http://placehold.it/580x580';
      ImageModel.__super__.constructor.apply(this, arguments);
    }
    ImageModel.prototype.read = function(filter, callback, socket) {
      return callback(null, {
        url: this.url,
        id: '_oneimage_'
      });
    };
    ImageModel.prototype.update = function(data, callback, socket) {
      this.url = data.url;
      callback(null, data);
      return this.emit('update', data, socket);
    };
    return ImageModel;
  })();
  UserSetting = (function() {
    __extends(UserSetting, Skull.Model);
    function UserSetting(id) {
      this.id = id;
      this.settings = {
        id: 'user_' + this.id,
        name: 'No name',
        country: 'No country'
      };
    }
    UserSetting.prototype.read = function(filter, callback, socket) {
      console.log('Reading settings for user ', this.id);
      return callback(null, this.settings);
    };
    UserSetting.prototype.update = function(data, callback, socket) {
      console.log('Updating settings for user ', this.id);
      this.settings = data;
      callback(null, this.settings);
      return this.emit('update', this.settings, socket);
    };
    return UserSetting;
  })();
  UserSettings = (function() {
    function UserSettings() {}
    UserSettings.prototype.settings = {};
    UserSettings.prototype.get = function(sid) {
      var existing;
      existing = this.settings[sid];
      if (!existing) {
        existing = this.settings[sid] = new UserSetting(sid);
      }
      return existing;
    };
    return UserSettings;
  })();
  exports.App = (function() {
    function App() {}
    App.prototype.createServer = function(app) {
      var userSettings;
      userSettings = new UserSettings;
      this.io = io.listen(app);
      this.io.set('authorization', function(data, cb) {
        var res;
        res = {};
        return express.cookieParser()(data, res, function() {
          var sid;
          console.log('Parsed cookies: %j', data.cookies);
          sid = data.cookies['connect.sid'];
          if (!sid) {
            return cb("Not authorized", false);
          }
          console.log('Authorized user ', sid);
          data.sid = sid;
          return cb(null, true);
        });
      });
      this.skullServer = new Skull.Server(this.io);
      this.global = this.skullServer.of('/global');
      this.app = this.skullServer.of('/app');
      this.app.addModel(new ImageModel());
      this.app.addModel('/todos', new TodoModel());
      this.settingsHandler = this.global.addModel('/mySettings', new Skull.SidModel);
      this.global.on('connection', __bind(function(socket) {
        var usModel;
        console.log('Connection to global from ', socket.id);
        usModel = userSettings.get(socket.handshake.sid);
        if (usModel) {
          return this.settingsHandler.addModel(socket, usModel);
        } else {
          return console.log('User settings not found. This should not happen.');
        }
      }, this));
      return this.io.sockets.on('connection', __bind(function(socket) {
        return console.log('Socket connection from ', socket.id);
      }, this));
    };
    return App;
  })();
}).call(this);
