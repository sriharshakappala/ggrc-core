(function(can, $) {

can.Model.Cacheable("can.Model.Join", {
  join_keys : null
  , setup : function() {
    this._super.apply(this, arguments);
  }
  , init : function() {
    this._super && this._super.apply(this, arguments);
    //this.reinit();
    if(this === can.Model.Join) {
      this.bind("created.reinit destroyed.reinit", function(ev, instance) {
        if (instance instanceof can.Model.Join) {
          instance.reinit();
        //can.proxy(this, "reinit"));

          can.each(instance.constructor.join_keys, function(cls, key) {
            if (instance[key].refresh)
              instance[key].refresh();
            else {
              var obj =
                cls.findInCacheById(instance[key].id);
              obj && obj.refresh();
            }
          });
        }
      });
    }
  }
}, {
    init : function() {
      this._super && this._super.apply(this, arguments);
      this.reinit();
    }
  , reinit : function() {//ev, data) {
      this.init_join_objects();
  }
  , getOtherSide : function(obj) {
    var that = this;
    var keys = $.extend({}, this.constructor.join_keys);
    can.each(keys, function(cls, key) {
      if((that[key] && that[key] === obj)
        || (that[key] ? that[key].id : that[key + "_id"]) === obj.id
            && (obj instanceof cls || obj.type === cls.model_singular)
      ) {
        delete keys[key];
      }
    });
    keys = Object.keys(keys);
    if(keys.length === 1) {
      return this[keys[0]];
    } else {
      return null;
    }
  }

  , init_join_object_with_type: function(attr) {
      if(this[attr] instanceof can.Model) {
        return;
      }

      var object_id = this[attr + "_id"] || (this[attr] || {}).id
        , object_type = this[attr + "_type"] || (this[attr] || {}).type
        ;

      if (object_id && object_type && typeof object_type === "string") {
        this.attr(attr, CMS.Models.get_instance(
              object_type
            , object_id
            , this[attr]
            ) || this[attr]);
      } else if(object_id) {
        this.attr(attr, CMS.Models.get_instance(this[attr]));
      }
    }

  , init_join_object: function(attr, model_name) {
      var object_id = this[attr + "_id"] || (this[attr] || {}).id;

      if (object_id)
        this.attr(attr, CMS.Models.get_instance(
              model_name
            , object_id
            , this[attr]
            ).stub() || this[attr]);
    }

  , init_join_objects: function() {
      var that = this
        ;

      can.each(this.constructor.join_keys, function(model, attr) {
        if (model === can.Model.Cacheable)
          that.init_join_object_with_type(attr);
        else
          that.init_join_object(attr, model.shortName);
      });
    }
/*
  , init_object: function() {
      var that = this;
      this.init_join_objects();

      this.each(function(value, name) {
        if (value === null)
          that.removeAttr(name);
      });
    }

  , setup_reinit: function(init_super) {
      function reinit() {
        typeof init_super === "function" && init_super.call(this);
        this.init_object();
      }

      this.bind("created", can.proxy(reinit, this));
      reinit.call(this);
      this.bind("destroyed", function(ev) {
        can.each(ev.target.constructor.join_keys, function(cls, key) {
          ev.target[key].refresh();
        });
      });
    }*/
});

can.Model.Join("CMS.Models.Relationship", {
    root_object: "relationship"
  , root_collection: "relationships"
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , source : "CMS.Models.get_stub"
    , destination : "CMS.Models.get_stub"
  }
  , join_keys : {
    source : can.Model.Cacheable
    , destination : can.Model.Cacheable
  }
  , defaults : {
      source : null
    , destination : null
  }
  , findAll: "GET /api/relationships"
  , create: "POST /api/relationships"
  , destroy: "DELETE /api/relationships/{id}"
}, {
  reinit: function() {
    var that = this;

    //typeof this._super_init === "function" && this._super_init.call(this);
    this.attr("source", CMS.Models.get_instance(
      this.source_type
        || (this.source
            && (this.source.constructor
                && this.source.constructor.shortName
                || (!this.source.selfLink && this.source.type)))
      , this.source_id || (this.source && this.source.id)
      , this.source) || this.source);
    this.attr("destination", CMS.Models.get_instance(
      this.destination_type
        || (this.destination
            && (this.destination.constructor
                && this.destination.constructor.shortName
                || (!this.source.selfLink && this.destination.type)))
      , this.destination_id || (this.destination && this.destination.id)
      , this.destination) || this.destination);
  }
});

can.Model.Join("CMS.Models.ObjectSection", {
    root_object: "object_section"
  , root_collection: "object_sections"
  , join_keys : {
      "section" : CMS.Models.Section
    , "sectionable" : can.Model.Cacheable
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , section : "CMS.Models.Section.stub"
    , sectionable : "CMS.Models.get_stub"
  }
  , findAll: "GET /api/object_sections"
  , create: "POST /api/object_sections"
  , destroy: "DELETE /api/object_sections/{id}"
}, {
/*    init: function() {
      this.setup_reinit(this._super);
    }*/
});

can.Model.Join("CMS.Models.ObjectControl", {
    root_object: "object_control"
  , root_collection: "object_controls"
  , join_keys : {
      "control" : CMS.Models.Control
    , "controllable" : can.Model.Cacheable
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , control : "CMS.Models.Control.stub"
    , controllable : "CMS.Models.get_stub"
  }
  , findAll: "GET /api/object_controls"
  , create: "POST /api/object_controls"
  , destroy: "DELETE /api/object_controls/{id}"
}, {
/*    init: function() {
      this.setup_reinit(this._super);
    }*/
});

can.Model.Join("CMS.Models.ObjectObjective", {
    root_object: "object_objective"
  , root_collection: "object_objectives"
  , join_keys : {
      "objective" : CMS.Models.Objective
    , "objectiveable" : can.Model.Cacheable
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , objective : "CMS.Models.Objective.stub"
    , objectiveable : "CMS.Models.get_stub"
  }
  , findAll: "GET /api/object_objectives"
  , create: "POST /api/object_objectives"
  , destroy: "DELETE /api/object_objectives/{id}"
}, {
/*    init: function() {
      this.setup_reinit(this._super);
    }*/
});

can.Model.Join("CMS.Models.ProgramDirective", {
  root_object : "program_directive"
  , root_collection : "program_directives"
  , join_keys : {
      program : CMS.Models.Program
    , directive : CMS.Models.Directive
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , program : "CMS.Models.Program.stub"
    , directive : "CMS.Models.get_stub"
  }
  , findAll: "GET /api/program_directives"
  , create: "POST /api/program_directives"
  , destroy : "DELETE /api/program_directives/{id}"
}, {
});

can.Model.Join("CMS.Models.ObjectiveControl", {
  root_object : "objective_control"
  , root_collection : "objective_controls"
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , objective : "CMS.Models.Objective.stub"
    , control : "CMS.Models.Control.stub"
    }
  , join_keys : {
      "objective" : CMS.Models.Objective
    , "control" : CMS.Models.Control
    }
  , findAll: "GET /api/objective_controls"
  , create: "POST /api/objective_controls"
  , destroy : "DELETE /api/objective_controls/{id}"
}, {
});

can.Model.Join("CMS.Models.SystemControl", {
  root_object : "system_control"
  , root_collection : "system_controls"
  , attributes: {
      modified_by : "CMS.Models.Person.stub"
    , system : "CMS.Models.System.stub"
    , control : "CMS.Models.Control.stub"
  }
  , join_keys : {
    "system" : CMS.Models.System
    , "control" : CMS.Models.Control
  }
  , findAll: "GET /api/system_controls"
  , create: "POST /api/system_controls"
  , destroy : "DELETE /api/system_controls/{id}"
}, {
});

can.Model.Join("CMS.Models.SystemSystem", {
  root_object : "system_system"
  , root_collection : "system_systems"
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , parent : "CMS.Models.System.stub"
    , child : "CMS.Models.System.stub"
  }
  , join_keys : {
    "parent" : can.Model.Cacheable
    , "child" : can.Model.Cacheable
  }
  , findAll: "GET /api/system_systems"
  , create: "POST /api/system_systems"
  , destroy : "DELETE /api/system_systems/{id}"
}, {
});

can.Model.Join("CMS.Models.UserRole", {
  root_object : "user_role"
  , root_collection : "user_roles"
  , findAll : "GET /api/user_roles"
  , update : "PUT /api/user_roles/{id}"
  , create : "POST /api/user_roles"
  , destroy : "DELETE /api/user_roles/{id}"
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , person : "CMS.Models.Person.stub"
    , role : "CMS.Models.Role.stub"
  }
  , join_keys : {
      person : CMS.Models.Person
    , role : CMS.Models.Role
  }
}, {
});


can.Model.Join("CMS.Models.ControlSection", {
  root_collection : "control_sections"
  , root_object : "control_section"
  , findAll : "GET /api/control_sections"
  , create : "POST /api/control_sections"
  , destroy : "DELETE /api/control_sections/{id}"
  , join_keys : {
      section : CMS.Models.Section
    , control : CMS.Models.Control
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , section : "CMS.Models.Section.stub"
    , control : "CMS.Models.Control.stub"
  }
}, {
});

can.Model.Join("CMS.Models.SectionObjective", {
  root_collection : "section_objectives"
  , root_object : "section_objective"
  , findAll : "GET /api/section_objectives"
  , create : "POST /api/section_objectives"
  , destroy : "DELETE /api/section_objectives/{id}"
  , join_keys : {
      section : CMS.Models.Section
    , objective : CMS.Models.Objective
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , section : "CMS.Models.Section.stub"
    , objective : "CMS.Models.Objective.stub"
  }
}, {
});

can.Model.Join("CMS.Models.DirectiveControl", {
    root_collection : "directive_controls"
  , root_object : "directive_control"
  , findAll : "GET /api/directive_controls"
  , create : "POST /api/directive_controls"
  , destroy : "DELETE /api/directive_controls/{id}"
  , join_keys : {
      directive : CMS.Models.Directive
    , control : CMS.Models.Control
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , directive : "CMS.Models.Directive.stub"
    , control : "CMS.Models.Control.stub"
  }
}, {
});

can.Model.Join("CMS.Models.ProgramControl", {
  root_collection : "program_controls"
  , root_object : "program_control"
  , join_keys : {
      program : CMS.Models.Program
    , control : CMS.Models.Control
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , program : "CMS.Models.Program.stub"
    , control : "CMS.Models.Control.stub"
  }
  , findAll : "GET /api/program_controls"
  , create : "POST /api/program_controls"
  , destroy : "DELETE /api/program_controls/{id}"
}, {

});

can.Model.Join("CMS.Models.ControlControl", {
  root_collection : "control_controls"
  , root_object : "control_control"
  , join_keys : {
      control : CMS.Models.Control
    , implemented_control : CMS.Models.Control
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , control : "CMS.Models.Control.stub"
    , implemented_control : "CMS.Models.Control.stub"
  }
  , findAll : "GET /api/control_controls"
  , create : "POST /api/control_controls"
  , destroy : "DELETE /api/control_controls/{id}"
}, {

});

can.Model.Join("CMS.Models.ControlRisk", {
  root_collection : "control_risks"
  , root_object : "control_risk"
  , join_keys : {
      control : CMS.Models.Control
    , risk : CMS.Models.Risk
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , control : "CMS.Models.Control.stub"
    , risk : "CMS.Models.Risk.stub"
  }
  , findAll : "GET /api/control_risks"
  , create : "POST /api/control_risks"
  , destroy : "DELETE /api/control_risks/{id}"
}, {

});

can.Model.Join("CMS.Models.ObjectPerson", {
  root_object : "object_person"
  , root_collection : "object_people"
  , findAll: "GET /api/object_people?__include=person"
  , create : "POST /api/object_people"
  , update : "PUT /api/object_people/{id}"
  , destroy : "DELETE /api/object_people/{id}"
  , join_keys : {
    personable : can.Model.Cacheable
    , person : CMS.Models.Person
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , person : "CMS.Models.Person.stub"
    , personable : "CMS.Models.get_stub"
  }

}, {});

can.Model.Join("CMS.Models.ObjectDocument", {
  root_object : "object_document"
  , root_collection : "object_documents"
  , findAll: "GET /api/object_documents?__include=document"
  , create: "POST /api/object_documents"
  , destroy : "DELETE /api/object_documents/{id}"
  , join_keys : {
    documentable : can.Model.Cacheable
    , document : CMS.Models.Document
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , document : "CMS.Models.Document.stub"
    , documentable : "CMS.Models.get_stub"
  }
}, {});

})(this.can, this.can.$);
