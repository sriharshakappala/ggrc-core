;(function(GGRC, can) {

  /*  GGRC.ListLoaders
   *
   *  - Generates and manages lists of related objects, pairing each instance
   *      with the one or more "mappings" -- join tables, direct relationships,
   *      etc -- which cause it to be present in the list.
   *
   *  Terminology:
   *    - "mappings" -- a list of "result" objects defining the path between
   *        the root object and the paired instance; can also be the boolean
   *        literal "true", to denote the "root" instance
   *    - "result" -- the (instance, mappings) pairs
   *    - "binding" -- the pairing between a list of results and the "root"
   *        instance for that list
   *        e.g., for each item in binding.list, if you follow the chain of
   *          mappings, you will eventually find
   *            ``{ instance: binding.instance, mappings: true }``
   */

  /*  GGRC.ListLoaders.MappingResult
   *
   *  - `instance`: The resulting item itself
   *  - `mappings`: Essentially, the reason(s) the instance appears in the
   *      list.  This may be an instance of can.Model or a pair containing
   *      (binding, result) in the case of a chained ListLoader.
   *
   *  For FilteredListLoader, the mappings are (`result`, `binding`), where
   *    `binding` is the binding in which the result appears, and thus,
   *    `binding.loader` contains information about the filter.
   *    `binding.instance`, then, is the instance on which the original,
   *    unfiltered list is specified.
   *  For CrossListLoader, the mappings are (`result`, `binding`), where
   *    `binding` is the "remote binding" which 
   */
  can.Construct("GGRC.ListLoaders.MappingResult", {
  }, {
      setup: function(instance, mappings, binding) {
        if (!mappings) {
          // Assume item was passed in as an object
          mappings = instance.mappings;
          binding = instance.binding;
          instance = instance.instance;
        }

        this.instance = instance;
        this.mappings = this._make_mappings(mappings);
        this.binding = binding;
      }

    , _make_mappings: function(mappings) {
        var i
          , mapping
          ;

        if (!mappings)
          mappings = [];

        for (i=0; i<mappings.length; i++) {
          mapping = mappings[i];
          if (!(mapping instanceof GGRC.ListLoaders.MappingResult))
            mapping = new GGRC.ListLoaders.MappingResult(mapping);
          mappings[i] = mapping;
        }

        return mappings;
      }

    , get_mappings: function() {
        var self = this
          , mappings = []
          ;

        this.walk_instances(function(instance, result, depth) {
          if (depth == 1) {
            if (instance === true)
              mappings.push(self.instance);
            else
              mappings.push(instance);
          }
        });
        return mappings;
      }

    , insert_mapping: function(mapping) {
        this.mappings.push(mapping);
        // Trigger change event on compute if compute has been requested
        if (this._mappings_observe)
          this._mappings_observe.attr('length', this.mappings.length);
      }

    , remove_mapping: function(mapping) {
        var ret;
        mapping_index = this.mappings.indexOf(mapping);
        if (mapping_index > -1) {
          ret = this.mappings.splice(mapping_index, 1);
          //  Trigger change event on compute if compute has been requested
          if (this._mappings_observe)
            this._mappings_observe.attr('length', this.mappings.length);
          return ret;
        }
      }

    , mappings_compute: function() {
        if (!this._mappings_compute)
          this._mappings_compute = this.get_mappings_compute();
        return this._mappings_compute;
      }

    , get_mappings_compute: function() {
        var self = this;

        // This observe serves only to trigger 'change' on mappings compute
        if (!this._mappings_observe)
          this._mappings_observe = new can.Observe();

        return can.compute(function() {
          // Unnecessary access of _mapping_observe to be able to trigger change
          self._mappings_observe.attr('length');
          return self.get_mappings();
        });
      }

    , walk_instances: function(fn, last_instance, depth) {
        var i;
        if (depth == null)
          depth = 0;
        if (this.instance !== last_instance) {
          fn(this.instance, this, depth);
          depth++;
        }
        for (i=0; i<this.mappings.length; i++) {
          this.mappings[i].walk_instances(fn, this.instance, depth);
        }
      }
  });

  /*  GGRC.ListLoaders.ListBinding
   */
  can.Construct("GGRC.ListLoaders.ListBinding", {
  }, {
      init: function(instance, loader) {
        this.instance = instance;
        this.loader = loader;

        this.list = new can.Observe.List();
        this.refresh_queue = new RefreshQueue();

        //this.listeners = {};
      }

    , refresh_stubs: function() {
        return this.loader.refresh_stubs(this);
      }

    , refresh_instances: function() {
        return this.loader.refresh_instances(this);
      }

    , refresh_list: function() {
        // Returns a list which will *only* ever contain fully loaded instances
        var loader = new GGRC.ListLoaders.ReifyingListLoader(this.loader)
          , binding = loader.attach(this.instance)
          ;

        binding.name = this.name + "_instances";
        return binding.refresh_instances(this);
      }

    , refresh_instance: function() {
        var refresh_queue = new RefreshQueue();
        refresh_queue.enqueue(this.instance);
        return refresh_queue.trigger();
      }
  });

  can.Construct("GGRC.ListLoaders.BaseListLoader", {
      binding_factory: function(instance, loader) {
        return new GGRC.ListLoaders.ListBinding(instance, loader);
      }
  }, {
      init: function() {
      }

    , attach: function(instance) {
        var binding = this.constructor.binding_factory(instance, this);
        this.init_listeners(binding);
        return binding;
      }

    , make_result: function(instance, mappings, binding) {
        return new GGRC.ListLoaders.MappingResult(instance, mappings, binding);
      }

    , find_result_by_instance: function(result, list) {
        var i
          , found_result = null;

        for (i=0; !found_result && i<list.length; i++) {
          old_result = list[i];
          if (old_result.instance.id == result.instance.id
              && old_result.instance.constructor.shortName
                  == result.instance.constructor.shortName) {
            found_result = old_result;
          }
        }

        return found_result;
      }

    , insert_results: function(binding, results) {
        var self = this
          , all_binding_results = []
          , new_instance_results = []
          , instances_to_refresh = []
          ;

        can.each(results, function(new_result) {
          var found_result = null;

          found_result = self.find_result_by_instance(new_result, binding.list);

          if (!found_result && binding.pending_list) {
            found_result = self.find_result_by_instance(new_result, binding.pending_list);
          }

          if (!found_result) {
            found_result = self.find_result_by_instance(new_result, new_instance_results);
          }

          if (found_result) {
            mapping_attr = found_result.mappings;
            // Since we're adding the result as its own mapping, use
            // new_result as the mapping instead of new_result.mappings?
            can.each(new_result.mappings, function(mapping) {
              // TODO: Examine when this will be false -- is it a sign of
              //   duplicate work?
              if (mapping_attr.indexOf(mapping) === -1) {
                found_result.insert_mapping(mapping);
                instances_to_refresh.push(new_result.instance);
              }
            });
          } else {
            //  FIXME: Loaders should be passing in newly instantiated results,
            //    so this line should be:
            //      found_result = new_result;
            //    but it's not a big deal
            found_result = self.make_result(new_result.instance, new_result.mappings, binding);
            new_instance_results.push(found_result);
            instances_to_refresh.push(new_result.instance);
            // FIXME: Also queue mappings to refresh?
          }

          all_binding_results.push(found_result);
        });

        if (new_instance_results.length > 0) {
          binding.list.push.apply(binding.list, new_instance_results);

          //  TODO: Examine whether deferring this list insertion avoids
          //    causing client-side freezes
          /*if (!binding.pending_list)
            binding.pending_list = [];
          binding.pending_list.push.apply(binding.pending_list, new_instance_results);

          if (!binding.pending_timeout) {
            binding.pending_deferred = new $.Deferred();
            binding.pending_timeout = setTimeout(function() {
              binding.list.push.apply(binding.list, binding.pending_list);
              delete binding.pending_list;
              delete binding.pending_timeout;
              binding.pending_deferred.resolve();
              delete binding.pending_deferred;
            }, 100);
          }*/
        }

        return all_binding_results;
      }

    , remove_instance: function(binding, instance, mappings) {
        var self = this
          , mappings
          , mapping_index
          , instance_index_to_remove = -1
          , indexes_to_remove = []
          ;

        if (!(can.isArray(mappings) || mappings instanceof can.Observe.List))
          mappings = [mappings];

        can.each(binding.list, function(data, instance_index) {
          var mapping_attr = binding.list[instance_index].mappings;

          if (data.instance.id == instance.id
              && data.instance.constructor.shortName == instance.constructor.shortName) {
            if (mapping_attr.length == 0) {
              indexes_to_remove.push(instance_index);
            } else {
              can.each(mappings, function(mapping) {
                var was_removed = data.remove_mapping(mapping);
                if (was_removed) {
                  if (mapping_attr.length == 0)
                    indexes_to_remove.push(instance_index);
                }
              });
            }
          }
        });
        can.each(indexes_to_remove.sort(), function(index_to_remove, count) {
          binding.list.splice(index_to_remove - count, 1);
        });
      }

    , refresh_stubs: function(binding) {
        if (!binding._refresh_stubs_deferred) {
          binding._refresh_stubs_deferred = $.when(this._refresh_stubs(binding));
        }
        return binding._refresh_stubs_deferred
          .then(function() { return binding.list; });
      }

    , refresh_instances: function(binding) {
        if (!binding._refresh_instances_deferred) {
          binding._refresh_instances_deferred =
            $.when(this._refresh_instances(binding));
        }
        return binding._refresh_instances_deferred
          .then(function() { return binding.list; });
      }

    , _refresh_instances: function(binding) {
        return this.refresh_stubs(binding)
          .then(function() {
            var refresh_queue = new RefreshQueue();
            can.each(binding.list, function(result) {
              refresh_queue.enqueue(result.instance);
            });
            return refresh_queue.trigger();
          });
      }
  });

  GGRC.ListLoaders.BaseListLoader("GGRC.ListLoaders.StubFilteredListLoader", {
  }, {
      init: function(source, filter_fn) {
        this._super();

        this.source = source;
        this.filter_fn = filter_fn;
      }

    , init_listeners: function(binding) {
        var self = this;

        binding.source_binding = binding.instance.get_binding(this.source);

        binding.source_binding.list.bind("add", function(ev, results) {
          var matching_results = can.map(can.makeArray(results), function(result) {
            if (self.filter_fn(result))
              return self.make_result(result.instance, [result], binding);
          });
          self.insert_results(binding, matching_results);
        });

        binding.source_binding.list.bind("remove", function(ev, results) {
          can.each(results, function(result) {
            self.remove_instance(binding, result.instance, result);
          });
        });
      }

    , _refresh_stubs: function(binding) {
        var self = this
          ;

        return binding.source_binding.refresh_stubs()
          .then(function(results) {
            var matching_results = can.map(can.makeArray(results), function(result) {
              if (self.filter_fn(result))
                return self.make_result(result.instance, [result], binding);
            });
            self.insert_results(binding, matching_results);
          });
      }
  });

  GGRC.ListLoaders.BaseListLoader("GGRC.ListLoaders.CrossListLoader", {
  }, {
      init: function(local_mapping, remote_mapping) {
        this._super();

        this.local_mapping = local_mapping;
        this.remote_mapping = remote_mapping;
      }

    , init_listeners: function(binding) {
        var self = this;

        if (!binding.bound_insert_from_source_binding) {
          binding.bound_insert_from_source_binding =
            this.proxy("insert_from_source_binding", binding);
          binding.bound_remove_from_source_binding =
            this.proxy("remove_from_source_binding", binding);
        }

        binding.source_binding = binding.instance.get_binding(this.local_mapping);

        binding.source_binding.list.bind(
            "add", binding.bound_insert_from_source_binding);
        binding.source_binding.list.bind(
            "remove", binding.bound_remove_from_source_binding);
      }

    , insert_from_source_binding: function(binding, ev, local_results, index) {
        var self = this;
        can.each(local_results, function(local_result) {
          // FIXME: This is identical to code in _refresh_stubs
          var remote_binding = self.insert_local_result(binding, local_result);
          remote_binding.refresh_instance().then(function() {
            remote_binding.refresh_stubs();
          });
        });
      }

    , remove_from_source_binding: function(binding, ev, local_results, index) {
        var self = this;
        can.each(local_results, function(local_result) {
          self.remove_local_result(binding, local_result);
        });
      }

    , insert_local_result: function(binding, local_result) {
        var self = this
          , remote_binding
          , i
          , found = false
          , local_results
          ;

        if (!binding.remote_bindings)
          binding.remote_bindings = [];

        for (i=0; i<binding.remote_bindings.length; i++) {
          if (binding.remote_bindings[i].instance === local_result.instance)
            return binding.remote_bindings[i];
        }

        remote_binding =
          local_result.instance.get_binding(self.remote_mapping);
        remote_binding.bound_insert_from_remote_binding =
          this.proxy("insert_from_remote_binding", binding, remote_binding);
        remote_binding.bound_remove_from_remote_binding =
          this.proxy("remove_from_remote_binding", binding, remote_binding);

        binding.remote_bindings.push(remote_binding);

        remote_binding.list.bind(
          "add", remote_binding.bound_insert_from_remote_binding);
        remote_binding.list.bind(
          "remove", remote_binding.bound_remove_from_remote_binding);

        local_results = can.map(remote_binding.list, function(result) {
          return self.make_result(result.instance, [result], binding);
        });
        self.insert_results(binding, local_results);

        return remote_binding;
      }

    , remove_local_result: function(binding, local_result) {
        var self = this
          , remote_binding
          , i
          , found = false
          , remote_binding_index
          ;

        if (!binding.remote_bindings)
          binding.remote_bindings = [];

        for (i=0; i<binding.remote_bindings.length; i++) {
          if (binding.remote_bindings[i].instance === local_result.instance)
            remote_binding = binding.remote_bindings[i];
        }

        if (!remote_binding) {
          console.debug("Removed binding not found:", local_result, binding);
          return;
        }

        remote_binding.list.unbind(
            "add", remote_binding.bound_insert_from_remote_binding);
        remote_binding.list.unbind(
            "remove", remote_binding.bound_remove_from_remote_binding);

        can.each(remote_binding.list, function(result) {
          self.remove_instance(binding, result.instance, result);
        });

        remote_binding_index = binding.remote_bindings.indexOf(remote_binding);
        binding.remote_bindings.splice(remote_binding_index, 1);
      }

    , insert_from_remote_binding: function(binding, remote_binding, ev, results, index) {
        var self = this
          , new_results = can.map(results, function(result) {
              return self.make_result(result.instance, [result], binding);
            })
          , inserted_results = this.insert_results(binding, new_results);
          ;
      }

    , remove_from_remote_binding: function(binding, remote_binding, ev, results, index) {
        var self = this;
        can.each(results, function(result) {
          self.remove_instance(binding, result.instance, result);
        });
      }

    , _refresh_stubs: function(binding) {
        var self = this
          ;

        return binding.source_binding.refresh_stubs().then(function(local_results) {
          var deferreds = [];

          can.each(local_results, function(local_result) {
            var remote_binding = self.insert_local_result(binding, local_result)
              , deferred = remote_binding.refresh_instance().then(function() {
                  return remote_binding.refresh_stubs();
                })
              ;

            deferreds.push(deferred);
          });

          return $.when.apply($, deferreds);
        })
        .then(function() { return binding.list; });
      }
  });

  GGRC.ListLoaders.StubFilteredListLoader("GGRC.ListLoaders.TypeFilteredListLoader", {
  }, {
      init: function(source, model_names) {
        var filter_fn = function(result) {
          var i, model_name;
          for (i=0; i<model_names.length; i++) {
            model_name = model_names[i];
            if (typeof model_name !== 'string')
              model_name = model_name.shortName;
            if (result.instance.constructor
                && result.instance.constructor.shortName === model_name)
              return true;
          }
          return false;
        };

        this._super(source, filter_fn);
      }
  });

  GGRC.ListLoaders.BaseListLoader("GGRC.ListLoaders.MultiListLoader", {
  }, {
      init: function(sources) {
        this._super();

        this.sources = sources || [];
      }

    , init_listeners: function(binding) {
        var self = this;

        if (!binding.source_bindings)
          binding.source_bindings = [];

        can.each(this.sources, function(source) {
          var source_binding = null;
          source_binding = binding.instance.get_binding(source);
          if (source) {
            binding.source_bindings.push(source_binding);
            self.init_source_listeners(binding, source_binding);
          }
        });
      }

    , insert_from_source_binding: function(binding, results, index) {
        var self = this
          , new_results
          ;

        new_results = can.map(results, function(result) {
          return self.make_result(result.instance, [result], binding);
        });
        self.insert_results(binding, new_results);
      }

    , init_source_listeners: function(binding, source_binding) {
        var self = this;

        self.insert_from_source_binding(binding, source_binding.list);

        source_binding.list.bind("add", function(ev, results) {
          self.insert_from_source_binding(binding, results);
        });

        source_binding.list.bind("remove", function(ev, results) {
          can.each(results, function(result) {
            self.remove_instance(binding, result.instance, result);
          });
        });
      }

    , _refresh_stubs: function(binding) {
        var deferreds = [];

        can.each(binding.source_bindings, function(source_binding) {
          deferreds.push(source_binding.refresh_stubs());
        });

        return $.when.apply($, deferreds);
      }
  });


  /*  ProxyListLoader
   *  - handles relationships across join tables
   *
   *  - listens to:
   *      - join_model.created
   *      - join_model.destroyed
   *      - not implemented:
   *        - join_instance.change(object_attr)
   *        - join_instance.change(option_attr)
   */
  GGRC.ListLoaders.BaseListLoader("GGRC.ListLoaders.ProxyListLoader", {
  }, {
      init: function(model_name, object_attr, option_attr,
                     object_join_attr, option_model_name) {
        this._super();

        this.model_name = model_name;
        this.object_attr = object_attr;
        this.option_attr = option_attr;
        this.object_join_attr = object_join_attr;
        this.option_model_name = option_model_name;
      }

    , init_listeners: function(binding) {
        var self = this
          , model = CMS.Models[this.model_name]
          ;

        model.bind("created", function(ev, mapping) {
          if (mapping instanceof model)
            self.filter_and_insert_instances_from_mappings(binding, [mapping]);
        });

        model.bind("destroyed", function(ev, mapping) {
          if (mapping instanceof model)
            self.remove_instance_from_mapping(binding, mapping);
        });

        //  FIXME: This is only needed in DirectListLoader, right?
        model.bind("orphaned", function(ev, mapping) {
          if (mapping instanceof model)
            self.remove_instance_from_mapping(binding, mapping);
        });
      }

    , is_valid_mapping: function(binding, mapping) {
        var model = CMS.Models[this.model_name]
          , object_model = binding.instance.constructor
          , option_model = CMS.Models[this.option_model_name]
          ;

        return (mapping.constructor === model
                && mapping[this.object_attr]
                && (mapping[this.object_attr].reify() === binding.instance
                    || (mapping[this.object_attr].reify().constructor == object_model &&
                        mapping[this.object_attr].id == binding.instance.id))
                && (!option_model
                    || mapping[this.option_attr].reify() instanceof option_model));
      }

    , filter_and_insert_instances_from_mappings: function(binding, mappings) {
        var self = this
          , matching_mappings
          ;

        matching_mappings = can.map(can.makeArray(mappings), function(mapping) {
          if (self.is_valid_mapping(binding, mapping))
            return mapping;
        });
        return this.insert_instances_from_mappings(binding, matching_mappings);
      }

    , insert_instances_from_mappings: function(binding, mappings) {
        var self = this
          , new_results
          ;

        new_results = can.map(can.makeArray(mappings), function(mapping) {
          return self.get_result_from_mapping(binding, mapping);
        });
        this.insert_results(binding, new_results);
      }

    , remove_instance_from_mapping: function(binding, mapping) {
        var instance, result;
        if (this.is_valid_mapping(binding, mapping)) {
          instance = this.get_instance_from_mapping(binding, mapping);
          result = this.find_result_from_mapping(binding, mapping);
          if (instance)
            this.remove_instance(binding, instance, result);
        }
      }

    , get_result_from_mapping: function(binding, mapping) {
        return this.make_result({
            instance: mapping[this.option_attr].reify()
          , mappings: [{
                instance: mapping
              , mappings: [{
                    instance: true
                  , mappings: []
                  }]
              , binding: binding
              }]
          });
      }

    , get_instance_from_mapping: function(binding, mapping) {
        return mapping[this.option_attr].reify();
      }

    , find_result_from_mapping: function(binding, mapping) {
        var result_i, mapping_i, result;
        for (result_i=0; result_i<binding.list.length; result_i++) {
          result = binding.list[result_i];
          for (mapping_i=0; mapping_i < result.mappings.length; mapping_i++) {
            mapping_result = result.mappings[mapping_i];
            if (mapping_result.instance === mapping)
              return mapping_result;
          }
        }
      }

    , _refresh_stubs: function(binding) {
        var self = this
          , model = CMS.Models[this.model_name]
          , refresh_queue = new RefreshQueue()
          , object_join_attr = this.object_join_attr || model.table_plural
          ;

        can.each(binding.instance[object_join_attr].reify(), function(mapping) {
          refresh_queue.enqueue(mapping);
        });

        return refresh_queue.trigger()
          .then(this.proxy("filter_for_valid_mappings", binding))
          .then(this.proxy("insert_instances_from_mappings", binding));
      }

    , filter_for_valid_mappings: function(binding, mappings) {
        // Remove incomplete mappings, including those not in our context
        //   (which the server refused to provide).
        var i
          , valid_mappings = [];

        for (i=0; i<mappings.length; i++) {
          if (mappings[i][this.option_attr])
            valid_mappings.push(mappings[i]);
        }
        return valid_mappings;
      }
  });

  /*  DirectListLoader
   *  - handles direct relationships / one-to-many relationships
   *
   *  - listens to:
   *      - model.created
   *      - model.destroyed
   *      - not implemented:
   *        - instance.change(object_attr)
   */
  GGRC.ListLoaders.BaseListLoader("GGRC.ListLoaders.DirectListLoader", {
  }, {
      init: function(model_name, object_attr) {
        this._super();

        this.model_name = model_name;
        this.object_attr = object_attr;
      }

    , init_listeners: function(binding) {
        var self = this
          , model = CMS.Models[this.model_name]
          ;

        model.bind("created", function(ev, mapping) {
          if (mapping instanceof model)
            self.filter_and_insert_instances_from_mappings(binding, [mapping]);
        });

        model.bind("destroyed", function(ev, mapping) {
          if (mapping instanceof model)
            self.remove_instance_from_mapping(binding, mapping);
        });

        model.bind("orphaned", function(ev, mapping) {
          if (mapping instanceof model)
            self.remove_instance_from_mapping(binding, mapping);
        });
      }

    , is_valid_mapping: function(binding, mapping) {
        var model = CMS.Models[this.model_name]
          , object_model = binding.instance.constructor
          ;

        return (mapping.constructor === model
                && mapping[this.object_attr]
                && (mapping[this.object_attr].reify() === binding.instance
                    || (mapping[this.object_attr].reify().constructor == object_model &&
                        mapping[this.object_attr].id == binding.instance.id)));
      }

    , filter_and_insert_instances_from_mappings: function(binding, mappings) {
        var self = this
          , matching_mappings
          ;

        matching_mappings = can.map(can.makeArray(mappings), function(mapping) {
          if (self.is_valid_mapping(binding, mapping))
            return mapping;
        });
        return this.insert_instances_from_mappings(binding, matching_mappings);
      }

    , insert_instances_from_mappings: function(binding, mappings) {
        var self = this
          , new_results
          ;

        new_results = can.map(can.makeArray(mappings), function(mapping) {
          return self.get_result_from_mapping(binding, mapping);
        });
        this.insert_results(binding, new_results);
      }

    , remove_instance_from_mapping: function(binding, mapping) {
        var instance;
        if (this.is_valid_mapping(binding, mapping)) {
          instance = this.get_instance_from_mapping(binding, mapping);
          result = this.find_result_from_mapping(binding, mapping);
          if (instance)
            this.remove_instance(binding, instance, result);
        }
      }

    , get_result_from_mapping: function(binding, mapping) {
        return this.make_result({
            instance: mapping
          , mappings: [{
                instance: true
              , mappings: []
              }]
          , binding: binding
          });
      }

    , get_instance_from_mapping: function(binding, mapping) {
        return mapping;
      }

    , find_result_from_mapping: function(binding, mapping) {
        var result_i, mapping_i, result;
        for (result_i=0; result_i<binding.list.length; result_i++) {
          result = binding.list[result_i];
          if (result.instance === mapping)
            // DirectListLoader can't have multiple mappings
            return result.mappings[0];
        }
      }

    , _refresh_stubs: function(binding) {
        var model = CMS.Models[this.model_name]
          , object_join_attr = this.object_join_attr || model.table_plural
          , mappings = binding.instance[object_join_attr].reify();
          ;

        this.insert_instances_from_mappings(binding, mappings);
      }
  });

  GGRC.ListLoaders.BaseListLoader("GGRC.ListLoaders.ReifyingListLoader", {
  }, {
      init: function(source) {
        this._super();

        this.source = source;
      }

    , insert_from_source_binding: function(binding, results, index) {
        var self = this
          , refresh_queue = new RefreshQueue()
          , new_results = []
          ;

        can.each(results, function(result) {
          refresh_queue.enqueue(result.instance);
          new_results.push(self.make_result(result.instance, [result], binding));
        });
        refresh_queue.trigger().then(function() {
          self.insert_results(binding, new_results);
        });
      }

    , init_listeners: function(binding) {
        var self = this;

        binding.source_binding = binding.instance.get_binding(this.source);
        this.insert_from_source_binding(binding, binding.source_binding.list, 0);

        binding.source_binding.list.bind("add", function(ev, results, index) {
          self.insert_from_source_binding(binding, results, index);
        });

        binding.source_binding.list.bind("remove", function(ev, results, index) {
          can.each(results, function(result) {
            self.remove_instance(binding, result.instance, result);
          });
        });
      }

    , _refresh_stubs: function(binding) {
        return binding.source_binding.refresh_stubs(binding);
      }
  });
})(GGRC, can);
