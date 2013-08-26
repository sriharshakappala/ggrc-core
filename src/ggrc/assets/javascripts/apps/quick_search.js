/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

//= require can.jquery-all
//= require controllers/quick_search_controller
(function(namespace, $) {

var RELATIONSHIP_TYPES = {
  "DataAsset":  {
    "Process": ["data_asset_has_process"]
    , "DataAsset": ["data_asset_relies_upon_data_asset"]
    , "Facility": ["data_asset_relies_upon_facility"]
    , "System": ["data_asset_relies_upon_system"]
    , "Market": []
    , "OrgGroup": []
    , "Product": []
    , "Program": []
    , "Project": []
  }, "Facility": {
    "Process": ["facility_has_process"]
    , "DataAsset": ["facility_relies_upon_data_asset"]
    , "Facility": ["facility_relies_upon_facility"]
    , "System": ["facility_relies_upon_system"]
    , "Market": []
    , "OrgGroup": []
    , "Product": []
    , "Program": []
    , "Project": []
  }, "Market": {
    "Process": ["market_has_process"]
    , "Market": ["market_includes_market"]
    , "DataAsset": ["market_relies_upon_data_asset"]
    , "Facility": ["market_relies_upon_facility"]
    , "System": ["market_relies_upon_system"]
    , "OrgGroup": []
    , "Product": []
    , "Program": []
    , "Project": []
  }, "OrgGroup": {
      "Process": ["org_group_has_process", "org_group_is_responsible_for_process"]
    , "OrgGroup": ["org_group_is_affiliated_with_org_group", "org_group_is_responsible_for_org_group", "org_group_relies_upon_org_group"]
    , "DataAsset": ["org_group_is_responsible_for_data_asset", "org_group_relies_upon_data_asset"]
    , "Facility": ["org_group_is_responsible_for_facility", "org_group_relies_upon_facility"]
    , "Market": ["org_group_is_responsible_for_market"]
    , "Product": ["org_group_is_responsible_for_product"]
    , "Project": ["org_group_is_responsible_for_project"]
    , "System": ["org_group_is_responsible_for_system", "org_group_relies_upon_system"]
    , "Program": []
  }, "Product": {
    "Process": ["product_has_process"]
    , "Product": ["product_is_affiliated_with_product", "product_relies_upon_product"]
    , "Market": ["product_is_sold_into_market"]
    , "DataAsset": ["product_relies_upon_data_asset"]
    , "Facility": ["product_relies_upon_facility"]
    , "System": ["product_relies_upon_system"]
    , "OrgGroup": []
    , "Program": []
    , "Project": []
  }, "Program": {
    "DataAsset": ["program_applies_to_data_asset"]
    , "Facility": ["program_applies_to_facility"]
    , "Market": ["program_applies_to_market"]
    , "OrgGroup": ["program_applies_to_org_group"]
    , "Process": ["program_applies_to_process"]
    , "Product": ["program_applies_to_product"]
    , "Project": ["program_applies_to_project"]
    , "System": ["program_applies_to_system"]
  }, "Project": {
    "Process": ["project_has_process"]
    , "DataAsset": ["project_relies_upon_data_asset", "project_targets_data_asset"]
    , "Facility": ["project_relies_upon_facility", "project_targets_facility"]
    , "System": ["project_relies_upon_system"]
    , "Market": ["project_targets_market"]
    , "OrgGroup": ["project_targets_org_group"]
    , "Product": ["project_targets_product"]
    , "Project": ["project_relies_upon_project"]
    , "Program": []
  }, "Risk": {
    "DataAsset": ["risk_is_a_threat_to_data_asset"]
    , "Facility": ["risk_is_a_threat_to_facility"]
    , "Market": ["risk_is_a_threat_to_market"]
    , "OrgGroup": ["risk_is_a_threat_to_org_group"]
    , "Process": ["risk_is_a_threat_to_process"]
    , "Product": ["risk_is_a_threat_to_product"]
    , "Project": ["risk_is_a_threat_to_project"]
    , "System": ["risk_is_a_threat_to_system"]
    , "Program": []
  }, "System": {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
    , "Program": []
    , "Regulation": []
    , "Policy" : []
    , "Contract" : []
  }, "Process": {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
    , "Program": []
    , "Regulation": []
    , "Policy" : []
    , "Contract" : []
  }};

GGRC.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;

  GGRC.JoinDescriptor = can.Construct({
      defaults: {
          object_model_name: null
        , option_model_name: null
        , join_model_name: null
        , join_option_attr: null
        , join_object_attr: null
        , join_options: null
        , options: null
      }

    , by_object_model: {}
    , by_option_model: {}
    , by_object_option_models: {}
    , by_option_object_models: {}

    , from_arguments_list: function(args_list) {
        var self = this;

        return can.map(args_list, function(args) {
          return self.from_arguments_cross_product.apply(self, args);
        });
      }

    , from_arguments_cross_product: function(
          object_model_names, option_model_names) {
        var self = this
          , rest = Array.prototype.splice.call(arguments, 2)
          , results = []
          ;

        if (!(object_model_names instanceof Array))
          object_model_names = [object_model_names];
        if (!(option_model_names instanceof Array))
          option_model_names = [option_model_names];

        can.each(object_model_names, function(object_model) {
          can.each(option_model_names, function(option_model) {
            results.push(
              self.from_arguments.apply(
                self, [object_model, option_model].concat(rest)))
          });
        });

        return results;
      }

    , from_arguments: function(
          object_model_name, option_model_name, join_model_name,
          join_option_attr, join_object_attr, join_options, options) {

        // Create a new subclass of `this`
        return new this($.extend({
            object_model_name: object_model_name
          , option_model_name: option_model_name
          , join_model_name: join_model_name
          , join_option_attr: join_option_attr
          , join_object_attr: join_object_attr
          , join_options: join_options || {}
        }, (options || {})), {});
      }
  }, {
      init: function(options) {
        var options = $.extend({}, this.constructor.defaults, options)
          , constructor = this.constructor
          , by_object_model = constructor.by_object_model
          , by_option_model = constructor.by_option_model
          , by_object_option_models = constructor.by_object_option_models
          , by_option_object_models = constructor.by_option_object_models
          , object_option_models
          , option_object_models
          , object_model_name = options.object_model_name
          , option_model_name = options.option_model_name
          ;

        this.options = options;

        // Add to registry of joins
        if (!by_object_model[object_model_name])
          by_object_model[object_model_name] = [];
        by_object_model[object_model_name].push(this);

        if (!by_option_model[option_model_name])
          by_option_model[option_model_name] = [];
        by_option_model[option_model_name].push(this);

        if (!by_object_option_models[object_model_name])
          by_object_option_models[object_model_name] = {};
        object_option_models = by_object_option_models[object_model_name];
        if (!object_option_models[option_model_name])
          object_option_models[option_model_name] = [];
        object_option_models[option_model_name].push(this);

        if (!by_option_object_models[option_model_name])
          by_option_object_models[option_model_name] = {};
        option_object_models = by_option_object_models[option_model_name];
        if (!option_object_models[object_model_name])
          option_object_models[object_model_name] = [];
        option_object_models[object_model_name].push(this);
      }

    , get_model: function(model_name) {
        return GGRC.Models[model_name] || CMS.Models[model_name] || null;
      }

    , get_join_model: function() {
        if (!this.options.join_model)
          this.options.join_model = this.get_model(this.options.join_model_name);
        return this.options.join_model;
      }

    , make_join_object: function(object, option, join_attrs) {
        var join_model = this.get_join_model() //this.get_model(this.options.join_model_name)
          , object_attrs = { id: object.id, type: object.constructor.shortName }
          , option_attrs = { id: option.id, type: option.constructor.shortName }
          ;

        join_attrs = $.extend({}, this.options.join_options, join_attrs || {});
        join_attrs[this.options.join_option_attr] = option_attrs;
        join_attrs[this.options.join_object_attr] = object_attrs;

        return new join_model(join_attrs);
      }
  });

  business_minus_system_object_types = [
    "DataAsset", "Facility", "Market", "OrgGroup",
    "Process", "Product", "Project"
    ];

  business_object_types =
    business_minus_system_object_types.concat(["System"]);

  business_plus_program_object_types =
    business_object_types.concat(["Program"]);

  directive_object_types = ["Regulation", "Policy", "Contract"];

  governance_object_types =
    directive_object_types.concat(["Control", "Section", "Objective"]);

  all_object_types =
    governance_object_types.concat(business_plus_program_object_types);

  join_descriptor_arguments = [
        [business_object_types,
          "Control", "ObjectControl", "control", "controllable"]
      , ["Control", business_object_types,
          "ObjectControl", "controllable", "control"]
      , [business_plus_program_object_types,
          "Objective", "ObjectObjective", "objective", "objectiveable"]
      , ["Objective", business_plus_program_object_types,
          "ObjectObjective", "objectiveable", "objective"]
      , [all_object_types,
          "Person", "ObjectPerson", "person", "personable"]
      , [business_object_types,
          "Section", "ObjectSection", "section", "sectionable"]
      , ["Section", business_object_types,
          "ObjectSection", "sectionable", "section"]
      , ["Control", "Program", "ProgramControl", "program", "control"]
      , ["Program", "Control", "ProgramControl", "control", "program"]
      , ["Control", "Section", "ControlSection", "section", "control"]
      , ["Section", "Control", "ControlSection", "control", "section"]
      , ["Control", "Objective", "ObjectiveControl", "objective", "control"]
      , ["Objective", "Control", "ObjectiveControl", "control", "objective"]
      //, ["System", "System", "SystemSystem", "child", "parent"]
      //, ["System", "Process", "SystemSystem", "child", "parent"]
      //, ["Process", "System", "SystemSystem", "child", "parent"]
      //, ["Process", "Process", "SystemSystem", "child", "parent"]
      //, ["System", "Control", "SystemControl", "control", "system"]
      //, ["Control", "System", "SystemControl", "system", "control"]
      , ["Program", directive_object_types, "ProgramDirective", "directive", "program"]
      , [directive_object_types, "Program", "ProgramDirective", "program", "directive"]
      , ["Section", "Objective", "SectionObjective", "objective", "section"]
      //, ["Objective", "Section", "SectionObjective", "section", "objective"]
      //, ["Risk", "Control", "RiskControl", "control", "risk"]
      //, ["Control", "Risk", "RiskControl", "risk", "control"]
      , [all_object_types,
          "Document", "ObjectDocument", "document", "documentable"]
      ];


  make_join_descriptor_arguments_from_relationships = function(relationship_types) {
    var relationship_join_descriptor_arguments = [];
    can.each(relationship_types, function(source_relationship_types, source_model) {
      can.each(source_relationship_types, function(relationship_type_ids, destination_model) {
        // For now, just ignore types in relationships
        /*can.each(relationship_type_ids, function(relationship_type_id) {
          //console.debug(relationship_type_id);
          relationship_join_descriptor_arguments.push(
            [source_model, destination_model, "Relationship", "destination", "source",
              { relationship_type_id: relationship_type_id }]);
          // Avoid double-adding symmetric relations
          if (destination_model !== source_model)
            relationship_join_descriptor_arguments.push(
              [destination_model, source_model, "Relationship", "source", "destination",
                { relationship_type_id: relationship_type_id }]);
        });*/
        relationship_join_descriptor_arguments.push(
          [destination_model, source_model, "Relationship", "source", "destination"]);
        if (destination_model != source_model)
          relationship_join_descriptor_arguments.push(
            [source_model, destination_model, "Relationship", "destination", "source"]);
      });
    });
    return relationship_join_descriptor_arguments;
  };

  GGRC.JoinDescriptor.from_arguments_list(join_descriptor_arguments);
  GGRC.JoinDescriptor.from_arguments_list(
      make_join_descriptor_arguments_from_relationships(RELATIONSHIP_TYPES));


$(function() {

  $(".recent").ggrc_controllers_recently_viewed();
  $("#lhs").cms_controllers_lhn_tooltips();

  var obs = new can.Observe();
  $("#lhs").bind("keypress", "input.widgetsearch", function(ev) {
    if(ev.which === 13)
      obs.attr("value", $(ev.target).val());
  });
  $("#lhs").cms_controllers_lhn_search({ observer: obs });

  function bindQuickSearch(ev, opts) {

    var $qs = $(this).uniqueId();
    var obs = new can.Observe();
    if($qs.find("ul.tree-structure").length) {
      return;
    }
    $qs.bind("keypress", "input.widgetsearch", function(ev) {
      if(ev.which === 13)
        obs.attr("value", $(ev.target).val());
    });
    can.getObject("Instances", CMS.Controllers.QuickSearch, true)[$qs.attr("id")] = 
     $qs.find(".lhs-nav:not(.recent), section.content")
      .cms_controllers_quick_search(can.extend({
        observer : obs
        , spin : $qs.is(":not(section)")
      }, opts)).control(CMS.Controllers.QuickSearch);

  }
  $("section.widget-tabs").each(function() {
    bindQuickSearch.call(this, {}, {});
  });//get anything that exists on the page already.

  //Then listen for new ones
  $(document.body).on("click", ".quick-search:not(:has(.cms_controllers_quick_search)), section.widget-tabs:not(:has(.cms_controllers_quick_search))", bindQuickSearch);

  $(document.body).on("click", ".bar-v", function(ev) {
    
    var $lhs = $("#lhs")
    ,   $lhsHolder = $(".lhs-holder")
    ,   $area = $(".area")
    ,   $bar = $(".bar-v")
    ;
    
    if( $lhs.hasClass("lhs-closed") ) {
      $lhs.removeClass("lhs-closed");
      $bar.removeClass("bar-closed");
      $lhsHolder.css("width","240px");
      $area.css("margin-left","248px");
    } else {
      $lhs.addClass("lhs-closed");
      $bar.addClass("bar-closed");
      $lhsHolder.css("width","40px");
      $area.css("margin-left","48px");
    }
    
    resize_areas();  
  });

  $(document.body).on("click", ".lhs-closed", function(ev) {
    
    var $lhs = $(this)
    ,   $lhsHolder = $(".lhs-holder")
    ,   $area = $(".area")
    ,   $bar = $(".bar-v")
    ;
    
    $lhs.removeClass("lhs-closed");
    $bar.removeClass("bar-closed");
    $lhsHolder.css("width","240px");
    $area.css("margin-left","248px");
    
    resize_areas();  
  });

  $(document.body).on("click", "a[data-toggle=unmap]", function(ev) {
    var $el = $(this)
      ;

    $el.children("span").each(function(i, mapping_el) {
      var $mapping_el = $(mapping_el)
        , mapping = $mapping_el.data('mapping');

      if (mapping) {
        mapping.refresh().done(function() {
          mapping.destroy();
        });
        //$mapping_el.remove();
      }
    });
  });

  $(document.body).on("click", ".map-to-page-object", function(ev) {
    var inst = $(ev.target).closest("[data-model], :data(model)").data("model")
    , page_model = GGRC.infer_object_type(GGRC.page_object)
    , page_instance = GGRC.make_model_instance(GGRC.page_object)
    , join_descriptor = GGRC.JoinDescriptor.by_object_option_models[page_model.shortName][inst.constructor.shortName][0]
    //, link = page_model.links_to[inst.constructor.model_singular]
    , params = {};

    if(typeof link === "string") {
      link = GGRC.Models[link] || CMS.Models[link];
    }

    function triggerFlash() {
      $(ev.target).trigger(
        "ajax:flash"
        , {
          success : [
            "Mapped"
            , inst.constructor.title_singular
            , "<strong>"
            , inst.title
            , "</strong> to"
            , page_model.title_singular
            , "<strong>"
            , page_instance.title
            , "</strong>"
            ].join(" ")
          });
    }

    /*if(can.isPlainObject(link)) {

      $("<div id='relationship_type_modal' class='modal hide'>").appendTo(document.body)
        .modal_form({}, ev.target)
        .ggrc_controllers_modals({
          new_object_form : true
          , button_view : GGRC.Controllers.Modals.BUTTON_VIEW_SAVE_CANCEL
          , model : CMS.Models.Relationship
          , page_object : page_instance
          , related_object : inst
          , relationships : can.map(RELATIONSHIP_TYPES[page_model.model_singular][inst.constructor.model_singular], function(v) {
            return {id : v, name : v.replace(/_/g, " ") };
          })
          , find_params : {
            source : page_instance
            , destination : inst
            , context : page_instance.context || { id : null }
          }
          , modal_title : "Select Relationship Type"
          , content_view : GGRC.mustache_path + "/base_objects/map_related_modal_content.mustache"
        })
        .one("modal:success", triggerFlash);
    } else {*/
      join_object = join_descriptor.make_join_object(
          page_instance, inst, { context: page_instance.context || { id : null } });
      join_object.save().done(triggerFlash);
      //params[page_model.root_object] = { id : page_instance.id };
      //params[inst.constructor.root_object] = { id : inst.id };
      //params.context = page_instance.context || { id : null };
      //new link(params).save().done(triggerFlash);
    //}

  });

});

})(this, jQuery);
