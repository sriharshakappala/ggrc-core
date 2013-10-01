/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

//require can.jquery-all

(function(can) {

can.Model.Cacheable("CMS.Models.Program", {
  root_object : "program"
  , root_collection : "programs"
  , category : "programs"
  , findAll : "/api/programs?kind=Directive"
  , create : "POST /api/programs"
  , update : "PUT /api/programs/{id}"
  , destroy : "DELETE /api/programs/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
    , program_directives : "CMS.Models.ProgramDirective.stubs"
    , directives : "CMS.Models.Directive.stubs"
    , program_controls : "CMS.Models.ProgramControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , cycles : "CMS.Models.Cycle.stubs"
  }
  , links_to : {
    "Regulation" : "ProgramDirective"
    , "Policy" : "ProgramDirective"
    , "Contract" : "ProgramDirective"
    , "System" : {}
    , "Process" : {}
    , "Control" : "ProgramControl"
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Product" : {}
    , "Market" : {}
  }
  , init : function() {
    this.validatePresenceOf("title");
    this._super.apply(this, arguments);
  }
}, {});

can.Model.Cacheable("CMS.Models.Cycle", {
}, {
});

can.Model.Cacheable("CMS.Models.Directive", {
  root_object : "directive"
  , root_collection : "directives"
  , category : "governance"
  // `rootModel` overrides `model.shortName` when determining polymorphic types
  , root_model : "Directive"
  , findAll : "/api/directives"

  , model : function(params) {
      if (this.shortName !== 'Directive')
        return this._super(params);
      if (!params)
        return params;
      params = this.object_from_resource(params);
      if (!params.selfLink) {
        if (params.type !== 'Directive')
          return CMS.Models[params.type].model(params);
      } else {
        if (CMS.Models.Contract.meta_kinds.indexOf(params.kind) > -1)
          return CMS.Models.Contract.model(params);
        else if (CMS.Models.Regulation.meta_kinds.indexOf(params.kind) > -1)
          return CMS.Models.Regulation.model(params);
        else if (CMS.Models.Policy.meta_kinds.indexOf(params.kind) > -1)
          return CMS.Models.Policy.model(params);
      }
      console.debug("Invalid Directive:", params);
    }

  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , program_directives : "CMS.Models.ProgramDirective.stubs"
    , directive_controls : "CMS.Models.DirectiveControl.stubs"
    , programs : "CMS.Models.Program.stubs"
    , sections : "CMS.Models.Section.stubs"
    , controls : "CMS.Models.Control.stubs"
  }
  , defaults : {
  }
  , init : function() {
    this.validatePresenceOf("title");
    //this.validateInclusionOf("kind", this.meta_kinds);
    this._super.apply(this, arguments);
  }
  , meta_kinds : []
  , links_to : { "Control" : "DirectiveControl", "Program" : "ProgramDirective" }
}, {
  init : function() {
    this._super && this._super.apply(this, arguments);
    var that = this;
    /*this.attr("descendant_sections", can.compute(function() {
      var sections = [].slice.call(that.attr("sections"), 0);
      return can.reduce(that.sections, function(a, b) {
        return a.concat(can.makeArray(b.descendant_sections()));
      }, sections);
    }));
    this.attr("descendant_sections_count", can.compute(function() {
      return that.attr("descendant_sections")(true).length; //giving it a value to force revalidation
    }));*/
  }
  , lowercase_kind : function() { return this.kind ? this.kind.toLowerCase() : undefined; }
});

CMS.Models.Directive("CMS.Models.Regulation", {
  root_object : "regulation"
  , root_collection : "regulations"
  , model_plural : "Regulations"
  , table_plural : "regulations"
  , title_plural : "Regulations"
  , model_singular : "Regulation"
  , title_singular : "Regulation"
  , table_singular : "regulation"
  , findAll : "GET /api/regulations"
  , create : "POST /api/regulations"
  , update : "PUT /api/regulations/{id}"
  , destroy : "DELETE /api/regulations/{id}"
  , defaults : {
    kind : "Regulation"
  }
  , tree_view_options : {
      list_view : GGRC.mustache_path + "/directives/tree.mustache"
    }
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , program_directives : "CMS.Models.ProgramDirective.stubs"
    , directive_controls : "CMS.Models.DirectiveControl.stubs"
    , programs : "CMS.Models.Program.stubs"
    , sections : "CMS.Models.Section.stubs"
    , controls : "CMS.Models.Control.stubs"
  }
  , meta_kinds : [ "Regulation" ]
  , cache : can.getObject("cache", CMS.Models.Directive, true)
}, {});

CMS.Models.Directive("CMS.Models.Policy", {
  root_object : "policy"
  , root_collection : "policies"
  , model_plural : "Policies"
  , table_plural : "policies"
  , title_plural : "Policies"
  , model_singular : "Policy"
  , title_singular : "Policy"
  , table_singular : "policy"
  , findAll : "GET /api/policies"
  , create : "POST /api/policies"
  , update : "PUT /api/policies/{id}"
  , destroy : "DELETE /api/policies/{id}"
  , defaults : {
    kind : "Company Policy"
  }
  , tree_view_options : {
      list_view : GGRC.mustache_path + "/directives/tree.mustache"
    }
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , program_directives : "CMS.Models.ProgramDirective.stubs"
    , directive_controls : "CMS.Models.DirectiveControl.stubs"
    , programs : "CMS.Models.Program.stubs"
    , sections : "CMS.Models.Section.stubs"
    , controls : "CMS.Models.Control.stubs"
  }
  , meta_kinds : [  "Company Policy", "Org Group Policy", "Data Asset Policy", "Product Policy", "Contract-Related Policy", "Company Controls Policy" ]
  , cache : can.getObject("cache", CMS.Models.Directive, true)
}, {});

CMS.Models.Directive("CMS.Models.Contract", {
  root_object : "contract"
  , root_collection : "contracts"
  , model_plural : "Contracts"
  , table_plural : "contracts"
  , title_plural : "Contracts"
  , model_singular : "Contract"
  , title_singular : "Contract"
  , table_singular : "contract"
  , findAll : "GET /api/contracts"
  , create : "POST /api/contracts"
  , update : "PUT /api/contracts/{id}"
  , destroy : "DELETE /api/contracts/{id}"
  , defaults : {
    kind : "Contract"
  }
  , tree_view_options : {
      list_view : GGRC.mustache_path + "/directives/tree.mustache"
    }
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , program_directives : "CMS.Models.ProgramDirective.stubs"
    , directive_controls : "CMS.Models.DirectiveControl.stubs"
    , programs : "CMS.Models.Program.stubs"
    , sections : "CMS.Models.Section.stubs"
    , controls : "CMS.Models.Control.stubs"
  }
  , meta_kinds : [ "Contract" ]
  , cache : can.getObject("cache", CMS.Models.Directive, true)
}, {});

can.Model.Cacheable("CMS.Models.OrgGroup", {
  root_object : "org_group"
  , root_collection : "org_groups"
  , category : "business"
  , findAll : "/api/org_groups"
  , create : "POST /api/org_groups"
  , update : "PUT /api/org_groups/{id}"
  , destroy : "DELETE /api/org_groups/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
  }
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
    , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    , child_options : [{
      model : null
      , find_params : {
        "destination_type" : "Process"
        , "source_type" : "OrgGroup"
        , relationship_type_id : "org_group_has_process"
      }
      , parent_find_param : "source_id"
      , draw_children : true
      , find_function : "findRelated"
      , related_side : "source"
      , create_link : true
    }, {
      model : null
      , find_params : {
        "destination_type" : "OrgGroup"
        , "source_type" : "OrgGroup"
        , relationship_type_id: "org_group_relies_upon_org_group"
      }
      , parent_find_param : "destination_id"
      , draw_children : true
      , start_expanded : false
      , find_function : "findRelatedSource"
      , related_side : "destination"
      , single_object : false
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Program" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Market" : {}
    }
  , init : function() {
    var that = this;
    this._super && this._super.apply(this, arguments);
    $(function(){
      that.tree_view_options.child_options[0].model = CMS.Models.Process;
    });
    this.tree_view_options.child_options[1].model = this;
    this.risk_tree_options.child_options[1] = can.extend(true, {}, this.tree_view_options.child_options[1]);
    this.risk_tree_options.child_options[1].create_link = false;

    this.validatePresenceOf("title");
  }
}, {});

can.Model.Cacheable("CMS.Models.Project", {
  root_object : "project"
  , root_collection : "projects"
  , category : "business"
  , findAll : "/api/projects"
  , create : "POST /api/projects"
  , update : "PUT /api/projects/{id}"
  , destroy : "DELETE /api/projects/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
  }
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
    , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    , child_options : [{
      model : null
      , find_params : {
        "destination_type" : "Process"
        , "source_type" : "Project"
        , relationship_type_id : "project_has_process"
      }
      , parent_find_param : "source_id"
      , draw_children : true
      , find_function : "findRelated"
      , related_side : "source"
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Program" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Market" : {}
    }
  , init : function() {
    var that = this;
    this._super && this._super.apply(this, arguments);
    this.risk_tree_options.child_options.splice(1, 1);
    $(function(){
      that.tree_view_options.child_options[0].model = CMS.Models.Process;
    });

    this.validatePresenceOf("title");
  }
}, {});

can.Model.Cacheable("CMS.Models.Facility", {
  root_object : "facility"
  , root_collection : "facilities"
  , category : "business"
  , findAll : "/api/facilities"
  , create : "POST /api/facilities"
  , update : "PUT /api/facilities/{id}"
  , destroy : "DELETE /api/facilities/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
  }
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
    , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    , child_options : [{
      model : null
      , find_params : {
        "destination_type" : "Process"
        , "source_type" : "Facility"
        , relationship_type_id : "facility_has_process"
      }
      , parent_find_param : "source_id"
      , draw_children : true
      , find_function : "findRelated"
      , related_side : "source"
      , create_link : true
    }, {
      model : null
      , find_params : {
        "destination_type" : "Facility"
        , "source_type" : "Facility"
        , relationship_type_id: "facility_relies_upon_facility"
      }
      , parent_find_param : "destination_id"
      , draw_children : true
      , start_expanded : false
      , find_function : "findRelatedSource"
      , related_side : "destination"
      , single_object : false
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Program" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Market" : {}
    }
  , init : function() {
    var that = this
    this._super && this._super.apply(this, arguments);
    $(function(){
      that.tree_view_options.child_options[0].model = CMS.Models.Process;
    });
    this.tree_view_options.child_options[1].model = this;
    this.risk_tree_options.child_options[1] = can.extend(true, {}, this.tree_view_options.child_options[1]);
    this.risk_tree_options.child_options[1].create_link = false;

    this.validatePresenceOf("title");
  }
}, {});

can.Model.Cacheable("CMS.Models.Product", {
  root_object : "product"
  , root_collection : "products"
  , category : "business"
  , findAll : "/api/products"
  , create : "POST /api/products"
  , update : "PUT /api/products/{id}"
  , destroy : "DELETE /api/products/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
    , type : "CMS.Models.Option.stub"
  }
  , defaults : {
    type : null
  }
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
    , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    , child_options : [{
      model : null
      , find_params : {
        "destination_type" : "Process"
        , "source_type" : "Product"
        , relationship_type_id : "product_has_process"
      }
      , parent_find_param : "source_id"
      , draw_children : true
      , find_function : "findRelated"
      , related_side : "source"
      , create_link : true
    }, {
      model : null
      , find_params : {
        "destination_type" : "Product"
        , "source_type" : "Product"
        , relationship_type_id: "product_relies_upon_product"
      }
      , parent_find_param : "destination_id"
      , draw_children : true
      , start_expanded : false
      , find_function : "findRelatedSource"
      , related_side : "destination"
      , single_object : false
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Program" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Product" : {}
    , "Market" : {}
    }
  , init : function() {
    var that = this
    this._super && this._super.apply(this, arguments);
    $(function(){
      that.tree_view_options.child_options[0].model = CMS.Models.Process;
    });
    this.tree_view_options.child_options[1].model = this;
    this.risk_tree_options.child_options[1] = can.extend(true, {}, this.tree_view_options.child_options[1]);
    this.risk_tree_options.child_options[1].create_link = false;

    this.validatePresenceOf("title");
  }
}, {
});

can.Model.Cacheable("CMS.Models.Option", {
  root_object : "option"
  , root_collection : "options"
  , cache_by_role: {}
  , for_role: function(role) {
      var self = this;

      if (!this.cache_by_role[role])
        this.cache_by_role[role] =
          this.findAll({ role: role }).then(function(options) {
            self.cache_by_role[role] = options;
            return options;
          });
      return $.when(this.cache_by_role[role]);
    }
}, {});

can.Model.Cacheable("CMS.Models.DataAsset", {
  root_object : "data_asset"
  , root_collection : "data_assets"
  , category : "business"
  , findAll : "/api/data_assets"
  , create : "POST /api/data_assets"
  , update : "PUT /api/data_assets/{id}"
  , destroy : "DELETE /api/data_assets/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
  }
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
    , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    , child_options : [{
      model : null
      , find_params : {
        "destination_type" : "Process"
        , "source_type" : "DataAsset"
        , relationship_type_id : "data_asset_has_process"
      }
      , parent_find_param : "source_id"
      , draw_children : true
      , find_function : "findRelated"
      , related_side : "source"
      , create_link : true
    }, {
      model : null
      , find_params : {
        "destination_type" : "DataAsset"
        , "source_type" : "DataAsset"
        , relationship_type_id: "data_asset_relies_upon_data_asset"
      }
      , parent_find_param : "destination_id"
      , draw_children : true
      , start_expanded : false
      , find_function : "findRelatedSource"
      , related_side : "destination"
      , single_object : false
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Program" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Market" : {}
    }
  , init : function() {
    var that = this;
    this._super && this._super.apply(this, arguments);
    $(function(){
      that.tree_view_options.child_options[0].model = CMS.Models.Process;
    });
    this.tree_view_options.child_options[1].model = this;
    this.risk_tree_options.child_options[1] = can.extend(true, {}, this.tree_view_options.child_options[1]);
    this.risk_tree_options.child_options[1].create_link = false;

    this.validatePresenceOf("title");
  }
}, {});

can.Model.Cacheable("CMS.Models.Market", {
  root_object : "market"
  , root_collection : "markets"
  , category : "business"
  , findAll : "/api/markets"
  , create : "POST /api/markets"
  , update : "PUT /api/markets/{id}"
  , destroy : "DELETE /api/markets/{id}"
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
  }
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
    , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    , child_options : [{
      model : null
      , find_params : {
        "destination_type" : "Process"
        , "source_type" : "Market"
        , relationship_type_id : "market_has_process"
      }
      , parent_find_param : "source_id"
      , draw_children : true
      , find_function : "findRelated"
      , related_side : "source"
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Program" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Market" : {}
    }
  , init : function() {
    var that = this;
    this._super && this._super.apply(this, arguments);
    this.risk_tree_options.child_options.splice(1, 1);
    $(function(){
      that.tree_view_options.child_options[0].model = CMS.Models.Process;
    });

    this.validatePresenceOf("title");
  }
}, {});

can.Model.Cacheable("CMS.Models.RiskyAttribute", {
  root_object : "risky_attribute"
  , root_collection : "risky_attributes"
  , category : "risk"
  , findAll : "/api/risky_attributes"
  , create : "POST /api/risky_attributes"
  , update : "PUT /api/risky_attributes/{id}"
  , destroy : "DELETE /api/risky_attributes/{id}"
  , links_to : ["Risk"]
  , init : function() {
    this.validatePresenceOf("title");
    this._super.apply(this, arguments);
  }
}, {});

can.Model.Cacheable("CMS.Models.Risk", {
  root_object : "risk"
  , root_collection : "risks"
  , category : "risk"
  , findAll : function(params) {
    var root_object =  this.root_object
    , root_collection = this.root_collection;
    return $.ajax({
      url : "/api/risks"
      , type : "get"
      , data : params
      , dataType : "json"
    }).then(function(risks) {
      if(risks[root_collection + "_collection"]) {
        risks = risks[root_collection + "_collection"];
      }
      if(risks[root_collection]) {
        risks = risks[root_collection];
      }

      can.each(risks, function(r) {
        if(r[root_object]) {
          r = r[root_object];
        }
        if(r.hasOwnProperty("trigger")) {
          r.risk_trigger = r.trigger;
          delete r.trigger;
        }
      });
      return risks;
    });
  }
  , update : "PUT /api/risks/{id}"
  , destroy : "DELETE /api/risks/{id}"
  , create : function(params) {
    params.trigger = params.risk_trigger;
    return $.ajax({
      type : "POST"
      , url : "/api/risks"
      , data : params
      , dataType : "json"
    });
  }
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
    , sections : "CMS.Models.Section.stubs"
  }
  , risk_tree_options : { show_view : GGRC.mustache_path + "/risks/tree.mustache", child_options : [], draw_children : false}
  , tree_view_options : {
    show_view : GGRC.mustache_path + "/risks/tree.mustache"
    , child_options : [{
      model : null
      , property : "controls"
      , create_link : true
      , draw_children : false
      , start_expanded : false
    }, {
      model : CMS.Models.RiskyAttribute
      , property : "risky_attributes"
      , draw_children : false
      , start_expanded : false
      , create_link : true
    }]}
  , links_to : {
    "System" : {}
    , "Process" : {}
    , "Product" : {}
    , "Facility" : {}
    , "OrgGroup" : {}
    , "Project" : {}
    , "DataAsset" : {}
    , "Market" : {}
    , "RiskyAttribute" : "RiskRiskyAttribute"
    }
  , init : function() {
    var that = this;
    this._super && this._super.apply(this, arguments);
    $(function() {
      that.tree_view_options.child_options[0].model = CMS.Models.Control;
    });

    this.validatePresenceOf("title");
  }
}, {});

can.Model.Cacheable("CMS.Models.Objective", {
  root_object : "objective"
  , root_collection : "objectives"
  , category : "governance"
  , title_singular : "Objective"
  , title_plural : "Objectives"
  , findAll : "GET /api/objectives"
  , create : "POST /api/objectives"
  , update : "PUT /api/objectives/{id}"
  , destroy : "DELETE /api/objectives/{id}"
  , links_to : {
      "Section" : "SectionObjective"
  }
  , attributes : {
      owner : "CMS.Models.Person.stub"
    , modified_by : "CMS.Models.Person.stub"
    , section_objectives : "CMS.Models.SectionObjective.stubs"
    , sections : "CMS.Models.Section.stubs"
    , objective_controls : "CMS.Models.ObjectiveControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , object_objectives : "CMS.Models.ObjectObjective.stubs"
    //, people : "CMS.Models.Person.stubs"
    //, documents : "CMS.Models.Document.stubs"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , related_sources : "CMS.Models.Relationship.stubs"
    , related_destinations : "CMS.Models.Relationship.stubs"
    , objective_objects : "CMS.Models.ObjectObjective.stubs"
  }

  , defaults : {
  }

  , tree_view_options : {
      show_view : GGRC.mustache_path + "/objectives/tree.mustache"
    , footer_view : GGRC.mustache_path + "/objectives/tree_footer.mustache"
    , create_link : true
    //, draw_children : true
    , start_expanded : false
    , child_options : [{
        model : "Control"
      , mapping : "controls"
      , show_view : "/static/mustache/controls/tree.mustache"
      , draw_children : false
    }, {
        model : "Person"
      , mapping : "people"
      , show_view : "/static/mustache/people/tree.mustache"
      , draw_children : false
    }, {
        model : "Document"
      , mapping : "documents"
      , show_view : "/static/mustache/documents/tree.mustache"
      , draw_children : false
/*    }, {
        model : "Section"
      , mapping : "sections"
      , show_view : "/static/mustache/sections/tree.mustache"
*/    }, {
        model : can.Model.Cacheable
      , mapping : "related_objects"
      , show_view : GGRC.mustache_path + "/base_objects/tree.mustache"
      , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
      , title_plural : "Business Objects"
      , draw_children : false
    }]
  }

  , init : function() {
    this.validatePresenceOf("title");
    this._super.apply(this, arguments);
  }
}, {
});

can.Model.Cacheable("CMS.Models.Help", {
  root_object : "help"
  , root_collection : "helps"
  , findAll : "GET /api/help"
  , update : "PUT /api/help/{id}"
  , destroy : "DELETE /api/help/{id}"
  , create : "POST /api/help"
}, {});

can.Model.Cacheable("CMS.Models.Event", {
  root_object : "event"
  , root_collection : "events"
  , findAll : "GET /api/events?__include=revisions,modified_by"
  , list_view_options : { find_function : "findPage" }
}, {});

can.Model.Cacheable("CMS.Models.Role", {
  root_object : "role"
  , root_collection : "roles"
  , findAll : "GET /api/roles"
  , update : "PUT /api/roles/{id}"
  , destroy : "DELETE /api/roles/{id}"
  , create : "POST /api/roles"
  , scopes : [
        "Private Program"
      , "System"
    ]
  , defaults : {
      permissions: {
          read: []
        , update: []
        , create: []
        , "delete": []
      }
    }
}, {

  allowed : function(operation, object_or_class) {
    var cls = typeof object_or_class === "function" ? object_or_class : object_or_class.constructor;
    return !!~can.inArray(cls.model_singular, this.permissions[operation]);
  }

  , not_system_role : function() {
    return this.attr('scope') !== "System";
  }

  , permission_summary : function() {
    if (this.name == "ProgramOwner") return "Owner";
    if (this.name == "ProgramEditor") return "Can Edit";
    if (this.name == "ProgramReader") return "View Only";
    return this.name;
  }

});

CMS.Models.get_instance = function(object_type, object_id, params_or_object) {
  var model, params = {}, instance = null;

  if(typeof object_type === "object") {
    //assume we only passed in params_or_object
    params_or_object = object_type;
    if (!params_or_object)
      return null;
    object_type =
      (params_or_object.constructor && params_or_object.constructor.shortName)
      || (!params_or_object.selfLink && params_or_object.type)
      || can.map(
          window.cms_singularize(
            /^\/api\/(\w+)\//.exec(params_or_object.selfLink || params_or_object.href)[1]
          ).split("_")
          , can.capitalize
        ).join("");
    object_id = params_or_object.id;
  }

  model = CMS.Models[object_type];

  if (!model)
    return null;

  if (!object_id)
    return null;

  if (!!params_or_object) {
    if ($.isFunction(params_or_object.serialize))
      $.extend(params, params_or_object.serialize());
    else
      $.extend(params, params_or_object || {});
  }

  instance = model.findInCacheById(object_id);
  if (!instance) {
    if (params.selfLink) {
      params.id = object_id;
      instance = new model(params);
    } else
      instance = new model({
          id: object_id
        , href: (params_or_object || {}).href
        });
  }
  return instance;
};

CMS.Models.get_stub = function(object) {
  return CMS.Models.get_instance(object).stub();
}

CMS.Models.get_stubs = function(objects) {
  return CMS.Models.get_instances(objects).stubs();
};

CMS.Models.get_instances = function(objects) {
  var i, instances = []
  if (!objects)
    return [];
  for (i=0; i<objects.length; i++) {
    instances[i] = CMS.Models.get_instance(objects[i]);
  }
  return instances;
  //return can.map(instances, CMS.Models.get_instance);
};

CMS.Models.get_link_type = function(instance, attr) {
  var type
    , model
    ;

  type = instance[attr + "_type"];
  if (!type) {
    model = instance[attr] && instance[attr].constructor;
    if (model)
      type = model.shortName;
    else if (instance[attr])
      type = instance[attr].type;
  }
  return type;
};

})(this.can);
