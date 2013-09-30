/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

//= require can.jquery-all

(function(can) {

var makeFindRelated = function(thistype, othertype) {
  return function(params) {
    if(!params[thistype + "_type"]) {
      params[thistype + "_type"] = this.shortName;
    }
    return CMS.Models.Relationship.findAll(params).then(function(relationships) {
      var dfds = [], things = new can.Model.List();
      can.each(relationships, function(rel,idx) {
        var dfd;
        if(rel[othertype].selfLink) {
          things.push(rel[othertype]);
        } else {
          dfd = rel[othertype].refresh().then(function(dest) {
            things.splice(idx, 1, dest);
          });
          dfds.push(dfd);
          things.push(dfd);
        }
      });
      return $.when.apply($, dfds).then(function(){ return things; });
    });
  };
};


can.Model("can.Model.Cacheable", {

  root_object : ""
  , root_collection : ""
  , model_singular : ""
  , model_plural : ""
  , table_singular : ""
  , table_plural : ""
  , title_singular : ""
  , title_plural : ""
  , findOne : "GET {href}"
  , setup : function(construct, name, statics, prototypes) {
    var overrideFindAll = false;
    if(this.fullName === "can.Model.Cacheable") {
      this.findAll = function() {
        throw "No default findAll() exists for subclasses of Cacheable";
      };
      this.findPage = function() {
        throw "No default findPage() exists for subclasses of Cacheable";
      }
    }
    else if((!statics || !statics.findAll) && this.findAll === can.Model.Cacheable.findAll) { 
      if(this.root_collection) {
        this.findAll = "GET /api/" + this.root_collection;
      } else {
        overrideFindAll = true;
      }
    }
    if(this.root_collection) {
      this.model_plural = statics.model_plural || this.root_collection.replace(/(?:^|_)([a-z])/g, function(s, l) { return l.toUpperCase(); } );
      this.title_plural = statics.title_plural || this.root_collection.replace(/(^|_)([a-z])/g, function(s, u, l) { return (u ? " " : "") + l.toUpperCase(); } );
      this.table_plural = statics.table_plural || this.root_collection;
    }
    if(this.root_object) {
      this.model_singular = statics.model_singular || this.root_object.replace(/(?:^|_)([a-z])/g, function(s, l) { return l.toUpperCase(); } );
      this.title_singular = statics.title_singular || this.root_object.replace(/(^|_)([a-z])/g, function(s, u, l) { return (u ? " " : "") + l.toUpperCase(); } );
      this.table_singular = statics.table_singular || this.root_object;
    }

    if (!can.isFunction(this.findAll)) {
      this.findPage = this.makeFindPage(this.findAll);
    }

    var ret = this._super.apply(this, arguments);
    if(overrideFindAll)
      this.findAll = can.Model.Cacheable.findAll;
    return ret;
  }
  , init : function() {
    this.bind("created", function(ev, new_obj) {
      var cache = can.getObject("cache", new_obj.constructor, true);
      if(new_obj.id) {
        cache[new_obj.id] = new_obj;
        if(cache[undefined] === new_obj)
          delete cache[undefined];
      }
    });
    this.bind("destroyed", function(ev, old_obj) {
      delete can.getObject("cache", old_obj.constructor, true)[old_obj.id];
    });
    //can.getObject("cache", this, true);

    var _update = this.update;
    this.update = function(id, params) {
      var ret = _update
        .call(this, id, this.process_args(params))
        .fail(function(status) {
          if(status === 409) {
            //handle conflict.
          }
        });
      delete ret.hasFailCallback;
      return ret;
    };

    var _create = this.create;
    this.create = function(params) {
      var ret = _create
        .call(this, this.process_args(params));
      delete ret.hasFailCallback;
      return ret;
    };


    var _refresh = this.makeFindOne({ type : "get", url : "{href}" });
    this.refresh = function(params) {
      var href = params.selfLink || params.href;

      if (href)
        return _refresh.call(this, {href : params.selfLink || params.href});
      else
        return (new can.Deferred()).reject();
    };

    var that = this;
    this.risk_tree_options = can.extend(true, {}, this.risk_tree_options); //for subclasses
    var risk_child_options = that.risk_tree_options.child_options[0];
    this.risk_tree_options.show_view = GGRC.mustache_path + "/base_objects/tree.mustache";
    if(risk_child_options) {
      risk_child_options.find_params.destination_type = that.shortName;
      risk_child_options.find_params.relationship_type_id = "risk_is_a_threat_to_" + this.root_object;
    }
    $(function() {
      if(risk_child_options)
        risk_child_options.model = CMS.Models.Risk;
      if(that.risk_tree_options.child_options && that.risk_tree_options.child_options.length > 1)
        that.risk_tree_options.child_options[1].model = that;
    });
  }

  , findInCacheById : function(id) {
    return can.getObject("cache", this, true)[id];
  }

  , newInstance : function(args) {
    var cache = can.getObject("cache", this, true);
    if(args && args.id && cache[args.id]) {
      //cache[args.id].attr(args, false); //CanJS has bugs in recursive merging 
                                          // (merging -- adding properties from an object without removing existing ones 
                                          //  -- doesn't work in nested objects).  So we're just going to not merge properties.
      return cache[args.id];
    } else {
      return can.Model.Cacheable.prototype.__proto__.constructor.newInstance.apply(this, arguments);
    }
  }
  , process_args : function(args, names) {
    var pargs = {};
    var obj = pargs;
    if(this.root_object && !(this.root_object in args)) {
      obj = pargs[this.root_object] = {};
    }
    var src = args.serialize ? args.serialize() : args;
    var go_names = (!names || names.not) ? Object.keys(src) : names;
    for(var i = 0 ; i < (go_names.length || 0) ; i++) {
      obj[go_names[i]] = src[go_names[i]];
    }
    if(names && names.not) {
      var not_names = names.not;
      for(i = 0 ; i < (not_names.length || 0) ; i++) {
        delete obj[not_names[i]];
      }
    }
    return pargs;
  }
  , findRelated : makeFindRelated("source", "destination")
  , findRelatedSource : makeFindRelated("destination", "source")
  , models : function(params) {
    if(params[this.root_collection + "_collection"]) {
      params = params[this.root_collection + "_collection"];
    }
    if(params[this.root_collection]) {
      params = params[this.root_collection];
    }
    if (!params || params.length == 0)
      return new this.List();
    var ms = this._super(params);
    if(params instanceof can.Observe) {
      params.replace(ms);
      return params;
    } else {
      return ms;
    }
  }
  , object_from_resource : function(params) {
      var obj_name = this.root_object;
      if(!params) {
        return params;
      }
      if(typeof obj_name !== "undefined" && params[obj_name]) {
          for(var i in params[obj_name]) {
            if(params[obj_name].hasOwnProperty(i)) {
              params.attr
              ? params.attr(i, params[obj_name][i])
              : (params[i] = params[obj_name][i]);
            }
          }
          if(params.removeAttr) {
            params.removeAttr(obj_name);
          } else {
            delete params[obj_name];
          }
      }
      return params;
    }

  , stubs : function(params) {
      return can.map(this.models(params), function(instance) {
        return instance.stub();
      });
    }

  , stub : function(params) {
      return this.model(params).stub();
    }

  , model : function(params) {
    var m, that = this;
    params = this.object_from_resource(params);
    if (!params)
      return params;
    var fn = (typeof params.each === "function") ? can.proxy(params.each,"call") : can.each;
    if(m = this.findInCacheById(params.id)) {
      if (m === params) {
        //return m;
      } else if (!params.selfLink) {
        //return m;
      } else {
      if (!m.selfLink) {
        //we are fleshing out a stub, which is much like creating an object new.
        //But we don't want to trigger every change event on the new object's props.
        m._init = 1;
        // Stub attributes should be removed to not conflict with real model
        // attributes; however, this should be well-tested first
        //m.removeAttr('type');
        //m.removeAttr('href');
      }
      fn(params, function(val, key) {
        if (key === 'context' && val == null && m[key] && m[key].id == null)
          return;
        val = that.get_attr(key, val);
        if (val == null)
          m.removeAttr(key)
        else
          m.attr(key, val);// && val.serialize ? val.serialize() : val);
      });
      delete m._init;
      }
    } else {
      fn(params, function(val, key) {
        val = that.get_attr(key, val);
        if (val == null) {
          if (params.removeAttr)
            params.removeAttr(key);
          else
            delete params[key];
        } else {
          if (params.attr) {
            params.attr(key, val);
          } else {
            params[key] = val;
          }
        }
      });
      m = this._super(params);
    }
    return m;
  }

  , get_attr: function(key, val) {
      // Special case to avoid constant replacement of `null` contexts
      var i = 0, j = 0, k, changed = false;
      converter = this.constructor.attributes && this.constructor.attributes[name];
      if (converter) {
        function_name = converter.substr(fun_name.lastIndexOf(".") + 1);
        converted_value = can.getObject(converter)(val);
        if (function_name === "stub"
            || function_name == "models"
            || function_name == "get_instances") {
          return can.map(converted_value, function(item) {
            return item.stub();
          });
        } else if (function_name === "stub"
                   || function_name == "model"
                   || function_name == "get_instance") {
          return converted_value.stub();
        } else {
          return converted_value;
        }
      } else {
        return val;
      }
    }
  , tree_view_options : {}
  , list_view_options : {}
  , risk_tree_options : {
    single_object : true
    , child_options : [{
      model : null
      , show_view : GGRC.mustache_path + "/risks/tree.mustache"
      , draw_children : false
      , find_params : {
        source_type : "Risk"
      }
      , find_function : "findRelatedSource"
      , create_link : true
      , related_side : "destination"
      , parent_find_param : "destination_id"
    }, {
      model : null
      , start_expanded : false
      , draw_children : true
    }]
  }
  , getRootModelName: function() {
    return this.root_model || this.shortName;
  }

  , makeFindPage: function(findAllSpec) {
      /* Create a findPage function that will return a paging object that will
       * provide access to the model items provided in a single page as well
       * as paging capability to retrieve the named pages provided in the
       * resposne.
       *
       * findPage returns an object with two properties:
       * {this.options.model.root_collection}_collection and paging. The models
       * property will be an array of all model instances in the page retrieved
       * for the collection. The paging property will be an object that can be
       * used to retrieve other named pages from the collection.  The names of
       * pages include first, prev, next, last. Named page properties will
       * either be functions or the null value in the case where there is no
       * link available in the collection under that name.  Paging functions
       * have the same type of return value as the findPage function.
       *
       * This method assumes that findAllSpec is a string like
       * "GET /api/programs". If this assumption is invalid, this function
       * WILL NOT work correctly.
       */
      var parts = findAllSpec.split(" ");
      var method = parts.length == 2 ? parts[0] : "GET";
      var collection_url = parts.length == 2 ? parts[1] : parts[0];
      var base_params = {
        type: method
        , dataType: "json"
      };

      var findPageFunc = function(url, data){
        return can.ajax(can.extend({
          url: url
          , data: data
        }, base_params)).then(function(response_data) {
            var collection = response_data[that.root_collection+"_collection"];
            var ret  = {
              paging: make_paginator(collection.paging)
            };
            ret[that.root_collection+"_collection"] = that.models(collection[that.root_collection]);
            return ret;
          });
      };

      var that = this;
      var make_paginator = function(paging) {
        var get_page = function(page_name) {
          if (paging[page_name]) {
            return function() { return findPageFunc(paging[page_name]); };
          } else {
            return null;
          }
        };

        return {
            count: paging.count
          , total: paging.total
          , first: get_page("first")
          , prev: get_page("prev")
          , next: get_page("next")
          , last: get_page("last")
          , has_next: function() { return this.next != null; }
          , has_prev: function() { return this.prev != null; }
        };
      };

      return function(params) {
        params = params || {};
        if (!params.__page) {
          params.__page = 1;
        }
        return findPageFunc(collection_url, params);
      };
    }
}, {
  init : function() {
    var cache = can.getObject("cache", this.constructor, true);
    if (this.id)
      cache[this.id] = this;
  }
  , computed_errors : function() {
      var that = this
        , compute = can.compute(function() { return that.errors(); });
      return compute;
    }

  , get_list_loader: function(name) {
      var binding = this.get_binding(name);
      return binding.refresh_list();
    }

  , get_mapping: function(name) {
      var binding = this.get_binding(name);
      binding.refresh_list();
      return binding.list;
    }

  , _get_binding_attr: function(mapper) {
      if (typeof(mapper) === "string")
        return "_" + mapper + "_binding";
    }

  , get_binding: function(mapper) {
      var mappings
        , mapping
        , binding
        , binding_attr = this._get_binding_attr(mapper)
        ;

      if (binding_attr) {
        binding = this[binding_attr];
      }

      if (!binding) {
        if (typeof(mapper) === "string") {
          // Lookup and attach named mapper
          mappings = GGRC.Mappings[this.constructor.shortName];
          mapping = mappings && mappings[mapper];
          if (!mapping)
            console.debug("No such mapper:  " + this.constructor.shortName + "." + mapper);
          else
            binding = mapping.attach(this);
        } else if (mapper instanceof GGRC.ListLoaders.BaseListLoader) {
          // Loader directly provided, so just attach
          binding = mapper.attach(this);
        } else {
          console.debug("Invalid mapper specified:", mapper);
        }
        if (binding && binding_attr) {
          this[binding_attr] = binding;
          binding.name = this.constructor.shortName + "." + mapper;
        }
      }
      return binding;
    }

  , addElementToChildList : function(attrName, new_element) {
    this[attrName].push(new_element);
    this._triggerChange(attrName, "set", this[attrName], this[attrName].slice(0, this[attrName].length - 1));
  }
  , removeElementFromChildList : function(attrName, old_element, all_instances) {
    for(var i = this[attrName].length - 1 ; i >= 0; i--) {
      if(this[attrName][i]===old_element) {
        this[attrName].splice(i, 1);
        if(!all_instances) break;
      }
    }
    this._triggerChange(attrName, "set", this[attrName], this[attrName].slice(0, this[attrName].length - 1));
  }
  , refresh : function(params) {
    var href = this.selfLink || this.href;

    if (!href)
      return (new can.Deferred()).reject();
    return $.ajax({
      url : href
      , params : params
      , type : "get"
      , dataType : "json"
    })
    .then(can.proxy(this.constructor, "model"))
    .done(function(d) {
      d.updated();
      //  Trigger complete refresh of object -- slow, but fixes live-binding
      //  redraws in some cases
      can.trigger(d, "change", "*");
    });
  }
  , attr : function() {
    if(arguments.length < 1) {
      // Short-circuit CanJS's "attr"-based serialization which leads to infinite recursion
      return this.serialize();
    } else {
      return this._super.apply(this, arguments);
    }
  }
  , serialize : function() {
    var that = this, serial = {};
    if(arguments.length) {
      return this._super.apply(this, arguments);
    }
    this.each(function(val, name) {
      var fun_name;
      if(that.constructor.attributes && that.constructor.attributes[name]) {
        fun_name = that.constructor.attributes[name];
        fun_name = fun_name.substr(fun_name.lastIndexOf(".") + 1);
        if (fun_name === "stubs" || fun_name === "get_stubs"
            ||fun_name === "models" || fun_name === "get_instances") {
          serial[name] = val.stubs().serialize();
        } else if (fun_name === "stub" || fun_name === "get_stub"
                   || fun_name === "model" || fun_name === "get_instance") {
          serial[name] = (val ? val.stub().serialize() : null);
        } else {
          serial[name] = that._super(name);
        }
      } else if(val && typeof val.save === "function") {
        serial[name] = val.stub().serialize();
      } else if(typeof val === "object" && val != null && val.length != null) {
        serial[name] = can.map(val, function(v) {
          return (v && typeof v.save === "function") ? v.stub().serialize() : (v.serialize ? v.serialize() : v);
        });
      } else if(typeof val !== 'function') {
        serial[name] = that[name] && that[name].serialize ? that[name].serialize() : that._super(name);
      }
    });
    return serial;
  }
  , display_name : function() {
    return this.title || this.name;
  }
});

_old_attr = can.Observe.prototype.attr;
can.Observe.prototype.attr = function(key, val) {
  if(key instanceof can.Observe) {
    if(arguments[0] === this)
      return this;
    else
      return _old_attr.apply(this, [key.serialize()]);
  } else {
    return _old_attr.apply(this, arguments);
  }
}
can.Observe.prototype.stub = function() {
  var type;

  if (this.constructor.shortName)
    type = this.constructor.shortName;
  else
    type = this.type;

  if (!this.id)
    return null;

  return new can.Observe({
    id : this.id,
    href : this.selfLink || this.href,
    type : type
  });
};

can.Observe.List.prototype.stubs = function() {
  return new can.Observe.List(can.map(this, function(obj) {
    return obj.stub();
  }));
}

can.Observe.prototype.reify = function() {
  var type = this.constructor.shortName || this.type;
  if (this.selfLink) {
    return this;
  } else if (CMS.Models[type]) {
    if (CMS.Models[type].cache
        && CMS.Models[type].cache[this.id]) {
        //&& CMS.Models[this.type].cache[this.id].selfLink) {
      return CMS.Models[type].cache[this.id];
    } else {
      return null;
    }
  } else {
    console.debug("`reify()` called on non-stub, non-instance object", this);
  }
};

can.Observe.List.prototype.reify = function() {
  return new can.Observe.List(can.map(this, function(obj) {
    return obj.reify();
  }));
}

})(window.can);
