/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

//= require can.jquery-all

function _firstElementChild(el) {
  if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    for (i=0; i<el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType !== Node.TEXT_NODE)
        return el.childNodes[i];
    }
  } else {
    return el;
  }
}

can.Observe("can.Observe.TreeOptions", {
  defaults : {
    instance : undefined
    , parent : null
    , children_drawn : false
  }
}, {
  // init : function() {
  //   this.bind("child_options.*.list", function(ev, newVal) {
  //     this.attr("children_drawn", !newVal.length)
  //     .attr("children_drawn", !!newVal.length);
  //   });
  // }
});

can.Control("CMS.Controllers.TreeView", {
  //static properties
  defaults : {
    model : null
    , header_view : null
    , show_view : "/static/mustache/base_objects/tree.mustache"
    , footer_view : null
    , parent : null
    , list : null
    , single_object : false
    , find_params : {}
    , start_expanded : false //true
    , draw_children : true
    , find_function : null
    , options_property : "tree_view_options"
    , allow_reading : true
    , allow_mapping : true
    , allow_creating : true
    , child_options : [] //this is how we can make nested configs. if you want to use an existing 
    //example child option :
    // { property : "controls", model : CMS.Models.Control, }
    // { parent_find_param : "system_id" ... }
  }
  , do_not_propagate : ["header_view", "footer_view", "list", "original_list", "single_object", "find_function"]
}, {
  //prototype properties
  setup : function(el, opts) {
    var that = this;
    typeof this._super === "function" && this._super.apply(this, [el]);
    if(opts instanceof can.Observe) {

      this.options = opts;
      if (typeof(this.options.model) === "string")
        this.options.attr("model", CMS.Models[this.options.model]);
      if(this.options.model) {
        can.each(this.options.model[opts.options_property || this.constructor.defaults.options_property], function(v, k) {
          that.options.hasOwnProperty(k) || that.options.attr(k, v);
        });
      }      
      can.each(this.constructor.defaults, function(v, k) {
        that.options.hasOwnProperty(k) || that.options.attr(k, v);
      });
    } else {
      if (typeof(opts.model) === "string")
        opts.model = CMS.Models[opts.model];
      this.options = new can.Observe(this.constructor.defaults).attr(opts.model ? opts.model[opts.options_property || this.constructor.defaults.options_property] : {}).attr(opts);
    }
  }

  , init : function(el, opts) {
    this.element.uniqueId();
    var that = this;

    // In some cases, this controller is immediately replaced
    setTimeout(function() {
      if (that.element) {
        that.element.trigger("loading");
        that.init_view();
        if (that.options.allow_reading)
          that.options.list ? that.draw_list() : that.fetch_list();
      }
    }, 100);

    this.options.attr("allow_mapping_or_creating",
      this.options.allow_mapping || this.options.allow_creating);
  }

  , init_view : function() {
      var that = this;

      if(this.options.header_view) {
        can.view(this.options.header_view, $.when(this.options)).then(function(frag) {
          if (that.element) {
            that.element.prepend(frag);
          }
        });
      }

      if(this.options.footer_view) {
        can.view(this.options.footer_view, this.options, function(frag) {
          if (that.element) {
            that.element.append(frag);
          }
        });
      }
    }

  , fetch_list : function() {
    var find_function;

    if (can.isFunction(this.options.find_params)) {
      this.options.list = this.options.find_params();
      this.draw_list();
    } else {
      if(can.isEmptyObject(this.options.find_params.serialize())) {
        this.options.find_params.attr(
          "id", this.options.parent_instance ? this.options.parent_instance.id : undefined);
      }

      if (this.options.mapping) {
        this.find_all_deferred =
          this.options.parent_instance.get_list_loader(this.options.mapping);
      } else if (this.options.list_loader) {
        this.find_all_deferred =
          this.options.list_loader(this.options.parent_instance);
      } else {
        if (this.options.find_function)
          find_function = this.options.find_function;
        else
          find_function = this.options.single_object ? "findOne" : "findAll";
        this.find_all_deferred =
          this.options.model[find_function](this.options.find_params.serialize());
        if (this.options.fetch_post_process)
          this.find_all_deferred =
            this.find_all_deferred.then(this.options.fetch_post_process);
      }

      this.find_all_deferred.done(this.proxy("draw_list"));
    }
  }

  , prepare_child_options: function(v) {
    //  v may be any of:
    //    <model_instance>
    //    { instance: <model instance>, mappings: [...] }
    //    <TreeOptions>
    var tmp, that = this;
    if(!(v instanceof can.Observe.TreeOptions)) {
      tmp = v;
      v = new can.Observe.TreeOptions();
      v.attr("instance", tmp);
      this.options.each(function(val, k) {
        ~can.inArray(k, that.constructor.do_not_propagate) || v.attr(k, val);
      });
    }
    if (!(v.instance instanceof can.Model)) {
      if (v.instance.instance instanceof can.Model) {
        v.attr("result", v.instance);
        v.attr("mappings", v.instance.mappings_compute());
        v.attr("instance", v.instance.instance);
      } else {
        v.attr("instance", this.options.model.model(v.instance));
      }
    }
    v.attr("child_count", can.compute(function() {
      var total_children = 0;
      if (v.attr("child_options")) {
        can.each(v.attr("child_options"), function(child_options) {
          var list = child_options.attr("list");
          if (list)
            total_children = total_children + list.attr('length');
        });
      }
      return total_children;
    }));
    return v;
  }

  , draw_list : function(list) {
    var that = this
    , header_dfd
    , refresh_queue = new RefreshQueue();
    
    if(list) {
      list = list.length == null ? new can.Observe.List([list]) : list;
    } else {
      list = this.options.list;
    }

    if(!this.element)
      return;  //controller has been destroyed
    can.Observe.startBatch();
    if(!this.options.original_list) {
      this.options.attr("original_list", list);
    }
    this.options.attr("list", []);
    this.on();

    var temp_list = [];
    can.each(list, function(v, i) {
      var item = that.prepare_child_options(v);
      temp_list.push(item);
      if(!item.instance.selfLink) {
        refresh_queue.enqueue(v.instance);
      }
    });
    refresh_queue.trigger().then(function() {
      can.Observe.stopBatch();
      that.options.list.replace(temp_list);
      that.add_child_lists(that.options.attr("list")); //since the view is handling adding new controllers now, configure before rendering.
      GGRC.queue_event(function() {
        function when_attached_to_dom(cb) {
          // Trigger the "more" toggle if the height is the same as the scrollable area
          !function poll() {
            if (!that.element) {
              return;
            } else if (that.element.closest(document.documentElement).length) {
              cb();
            }
            else {
              setTimeout(poll, 100);
            }
          }();
        }

        if (that.element) {
          when_attached_to_dom(function() {
            if (that.element.children(".tree-item.cms_controllers_tree_view_node").length !== that.options.list.length) {
              setTimeout(arguments.callee, 100);
              return;
            }

            that.element && that.element.trigger("updateCount", that.options.list.length)
            .trigger("loaded")
            .trigger("subtree_loaded")
            .find(".spinner").remove();
          });
        }
      });
    });
  }

  , "{original_list} add" : function(list, ev, newVals, index) {
    var that = this;
    can.each(newVals, function(newVal) {
      var _newVal = newVal.instance ? newVal.instance : newVal;
      if(!that.oldList || !~can.inArray(_newVal, that.oldList)) {
        that.element && that.element.trigger("newChild", newVal);
      } 
    });
    delete that.oldList;
  }
  , "{original_list} remove" : function(list, ev, oldVals, index) {
    var that = this;

    //  FIXME: This assumes we're replacing the entire list, and corrects for
    //    instances being removed and immediately re-added.  This should be
    //    changed to support exact mirroring of the order of
    //    `this.options.list`.
    //assume we are doing a replace
    this.oldList = can.map(oldVals, function(v) { return v.instance ? v.instance : v; });
    GGRC.queue_event(function() {
      if(that.oldList) {
        can.each(oldVals, function(v) {
          that.element && that.element.trigger("removeChild", v);
        });
        delete that.oldList;
      } else {
        list = can.map(list, function(l) { return l.instance || l});
        can.each(oldVals, function(v) {
          var _v = v.instance || v;
          if(!~can.inArray(_v, list)) {
            that.element && that.element.trigger("removeChild", v);
          }
        });
      }
    });
  }

  , ".tree-structure subtree_loaded" : function(el, ev) {
    ev.stopPropagation();
    var instance_id = el.closest(".tree-item").data("object-id");
    var parent = can.reduce(this.options.list, function(a, b) {
      switch(true) {
        case !!a : return a;
        case b.instance.id === instance_id: return b;
        default: return null;
      }
    }, null);
    if(parent.children_drawn)
      return;
    parent.attr("children_drawn", true);
  }

  // add child options to every item (TreeViewOptions instance) in the drawing list at this level of the tree.
  , add_child_lists : function(list) {
    var that = this;
    //Recursively define tree views anywhere we have subtree configs.
    this.element.trigger("loading");
    can.each(list, function(item) {
      GGRC.queue_event(that.proxy("draw_item", item));
    });
    GGRC.queue_event(function() {
      that.element && that.element.trigger("loaded");
    });
  }

  , draw_item : function(options) {
    var $li = $("<li>")
      , $footer = this.element.children('.tree-footer')
      ;

    if($footer.length) {
      $li.insertBefore($footer);
    } else {
      $li.appendTo(this.element);
    }
    $li.cms_controllers_tree_view_node(options);
  }

  // There is no check for parentage anymore.  When this event is triggered, it needs to be triggered
  // at the appropriate level of the tree.
  , " newChild" : function(el, ev, data) {
    //  FIXME: This should be done with indices so the elements exactly
    //    mirror the order of `this.options.list`.
    var prepped = this.prepare_child_options(data)
    this.options.list.push(prepped);
    this.add_child_lists([prepped]);
    ev.stopPropagation();
  }

  , " removeChild" : function(el, ev, data) {
    var that = this
      , instance
      ;

    if (data.instance && data.instance instanceof this.options.model)
      instance = data.instance;
    else
      instance = data;

    //  FIXME: This should be done using indices, when the order of elements
    //    is guaranteed to mirror the order of `this.options.list`.

    //  Replace the list with the list sans the removed instance
    that.options.list.replace(
      can.map(this.options.list, function(options, i) {
        if (options.instance !== instance)
          return options;
      }));

    //  Remove items by data attributes
    that.element.children([
        "[data-object-id=" + instance.id + "]"
      , "[data-object-type=" + instance.constructor.table_singular + "]"
      ].join("")
    ).remove();
    ev.stopPropagation();
  }

  , " updateCount": function(el, ev) {
      // Suppress events from sub-trees
      if (!($(ev.target).closest('.' + this.constructor._fullName).is(this.element)))
        ev.stopPropagation();
    }

  , "{list} add": function() {
      this.element.trigger('updateCount', this.options.list.length);
    }

  , "{list} remove": function() {
      this.element.trigger('updateCount', this.options.list.length);
    }

  , ".edit-object modal:success" : function(el, ev, data) {
    var model = el.closest("[data-model]").data("model");
    model.attr(data[model.constructor.root_object] || data);
    ev.stopPropagation();
  }

});

can.Control("CMS.Controllers.TreeViewNode", {
  defaults : {
    model : null
    , parent : null
    , show_view : "/static/mustache/base_objects/tree.mustache"
    , expanded : false
    , draw_children : true
    , child_options : []
  }
}, {
  setup : function(el, opts) {
    var that = this;
    typeof this._super === "function" && this._super.apply(this, [el]);
    if(opts instanceof can.Observe) {

      this.options = opts;
      if (typeof(this.options.model) === "string")
        this.options.attr("model", CMS.Models[this.options.model]);
      // if(this.options.model) {
      //   can.each(this.options.model[opts.options_property || this.constructor.defaults.options_property], function(v, k) {
      //     that.options.hasOwnProperty(k) || that.options.attr(k, v);
      //   });
      // }      
      can.each(this.constructor.defaults, function(v, k) {
        that.options.hasOwnProperty(k) || that.options.attr(k, v);
      });
    } else {
      if (typeof(opts.model) === "string")
        opts.model = CMS.Models[opts.model];
      this.options = new can.Observe.TreeOptions(this.constructor.defaults)
      .attr(opts.model ? opts.model[opts.options_property || this.constructor.defaults.options_property] : {})
      .attr(opts);
    }
  }
  , init : function(el, opts) {
    var that = this;
    this.add_child_lists_to_child();
    setTimeout(function() {
      can.view(that.options.show_view, that.options, function(frag) {
        that.replace_element(frag);
      });
    }, 20);
  }

  // add all child options to one TreeViewOptions object
  , add_child_lists_to_child : function() {
    var that = this
      , original_child_options = this.options.child_options
      , new_child_options = [];
    this.options.attr("child_options", new can.Observe.List())
    if (original_child_options.length == null)
      original_child_options = [original_child_options]

    if(this.options.draw_children) {
      can.each(original_child_options, function(data, i) {
        var options = new can.Observe();
        data.each(function(v, k) {
          options.attr(k, v);
        });
        that.add_child_list(that.options, options);
        options.attr({
            "options_property": that.options.options_property
          , "single_object": false
          //, "parent": that.options
          , "parent_instance": that.options.instance
        });
        // Don't allow mapping or creating unless this is the last list
        if (i < original_child_options.length - 1)
          options.attr({
            allow_mapping: false,
            allow_creating: false,
            allow_mapping_or_creating: false
          });
        new_child_options.push(options);
      });
      that.options.attr("child_options", new_child_options);
    }
  }

  // data is an entry from child options.  if child options is an array, run once for each.
  , add_child_list : function(item, data) {
    //var $subtree = $("<ul class='tree-structure'>").appendTo(el);
    //var model = $(el).closest("[data-model]").data("model");
    data.attr({ start_expanded : false });
    var find_params;
    if(can.isFunction(item.instance[data.property])) {
      // Special case for handling mappings which are functions until
      // first requested, then set their name via .attr('...')
      find_params = function() {
        return item.instance[data.property]();
      };
      data.attr("find_params", find_params);
    } else if(data.property) {
      find_params = item.instance[data.property];
      if(find_params && find_params.isComputed) {
        data.attr("original_list", find_params);
        find_params = find_params();
      } else if(find_params && find_params.length) {
        data.attr("original_list", find_params);
        find_params = find_params.slice(0);
      }
      data.attr("list", find_params);
    } else {
      find_params = data.attr("find_params");
      if(find_params) {
        find_params = find_params.serialize();
      } else {
        find_params = {};
      }
      if(data.parent_find_param){
        find_params[data.parent_find_param] = item.instance.id;
      } else {
        find_params["parent.id"] = item.instance.id;
      }
      data.attr("find_params", new can.Observe(find_params));
    }
    // $subtree.cms_controllers_tree_view(opts);
  }

  , replace_element : function(el) {
    var old_el = this.element
      , $el
      , old_data
      , i
      , firstchild
      ;

    if (!this.element)
      return;

    $el = $(el)
    old_data = $.extend({}, old_el.data())

    firstchild = $(_firstElementChild(el));

    old_data.controls = old_data.controls.slice(0);
    old_el.data("controls", []);
    this.off();
    old_el.replaceWith(el);
    this.element = firstchild.addClass(this.constructor._fullName).data(old_data);
    this.on();
  }

  , ".item-main expand" : function(el, ev) {
    ev.stopPropagation();
    this.options.attr('expanded', true);
    if(!this.options.child_options && this.options.draw_children) {
      this.add_child_lists_to_child();
    }
  }

  , ".openclose:not(.active) click" : function(el, ev) {
    // Ignore unless it's a direct child
    if (el.closest('.' + this.constructor._fullName).is(this.element))
      el.trigger("expand");
  }

});
