;(function(GGRC, can) {

  function Proxy(
      option_model_name, join_option_attr, join_model_name, join_object_attr,
      instance_join_attr) {
    return new GGRC.ListLoaders.ProxyListLoader(
        join_model_name, join_object_attr, join_option_attr,
        instance_join_attr, option_model_name);
  }

  function Direct(option_model_name, instance_join_attr) {
    return new GGRC.ListLoaders.DirectListLoader(option_model_name, instance_join_attr);
  }

  function Multi(sources) {
    return new GGRC.ListLoaders.MultiListLoader(sources);
  }

  function TypeFilter(source, model_name) {
    return new GGRC.ListLoaders.TypeFilteredListLoader(source, [model_name]);
  }

  function Cross(local_mapping, remote_mapping) {
    return new GGRC.ListLoaders.CrossListLoader(local_mapping, remote_mapping);
  }

  function create_mappings(definitions) {
    var mappings = {};

    // Recursively handle mixins
    function reify_mixins(definition) {
      var final_definition = {};
      if (definition._mixins) {
        can.each(definition._mixins, function(mixin) {
          if (typeof(mixin) === "string") {
            // If string, recursive lookup
            if (!definitions[mixin])
              console.debug("Undefined mixin: " + mixin, definitions);
            else
              can.extend(final_definition, reify_mixins(definitions[mixin]));
          } else if (can.isFunction(mixin)) {
            // If function, call with current definition state
            mixin(final_definition);
          } else {
            // Otherwise, assume object and extend
            can.extend(final_definition, mixin);
          }
        });
      }
      can.extend(final_definition, definition);
      delete final_definition._mixins;
      return final_definition;
    }

    can.each(definitions, function(definition, name) {
      // Only output the mappings if it's a model, e.g., uppercase first letter
      if (name[0] === name[0].toUpperCase())
        mappings[name] = reify_mixins(definition);
    });

    return mappings;
  }

  function extended_related(name) {
    return function(definition) {
      definition["related_" + name + "_via_sections"] = Cross("sections", "related_" + name);
      definition["related_" + name + "_via_extended_controls"] = Cross("extended_related_controls", "related_" + name);
      definition["related_" + name + "_via_extended_objectives"] = Cross("extended_related_objectives", "related_" + name);

      definition["extended_related_" + name] = Multi([
            "related_" + name + "_via_sections"
          , "related_" + name + "_via_extended_controls"
          , "related_" + name + "_via_extended_objectives"
          , "related_" + name
          ]);
    };
  }

  GGRC.Mappings = create_mappings({
      base: {
      }

    // Governance
    , Control: {
        _mixins: ["personable", "documentable"] //controllable
      , related_objects: Proxy(
          null, "controllable", "ObjectControl", "control", "object_controls") //control_objects
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      , programs: Proxy(
          "Program", "program", "ProgramControl", "control", "program_controls")
      //, controls: Proxy(
      //    "Control", "control", "ObjectControl", "controllable", "object_controls")
      , objectives: Proxy(
          "Objective", "objective", "ObjectiveControl", "control", "objective_controls")
      , sections: Proxy(
          "Section", "section", "ControlSection", "control", "control_sections")
      }
    , Objective: {
        _mixins: ["personable", "documentable"] //objectiveable
      , related_objects: Proxy(
          null, "objectiveable", "ObjectObjective", "objective", "objective_objects")
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      , objectives: Proxy(
          "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")
      , controls: Proxy(
          "Control", "control", "ObjectiveControl", "objective", "objective_controls")
      , sections: Proxy(
          "Section", "section", "SectionObjective", "objective", "section_objectives")
      }
    , Section: {
        _mixins: ["personable", "documentable"] //sectionable
      , related_objects: Proxy(
          null, "sectionable", "ObjectSection", "section", "object_sections") //section_objects
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      //, sections: Proxy(
      //    "Section", "section", "ObjectSection", "sectionable", "object_sections")
      , objectives: Proxy(
          "Objective", "objective", "SectionObjective", "section", "section_objectives")
      , controls: Proxy(
          "Control", "control", "ControlSection", "section", "control_sections")
      }

    , controllable: {
        controls: Proxy(
          "Control", "control", "ObjectControl", "controllable", "object_controls")
      }

    , objectiveable: {
        objectives: Proxy(
          "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")
      }

    , sectionable: {
        sections: Proxy(
          "Section", "section", "ObjectSection", "sectionable", "object_sections")
      }

    , personable: {
        people: Proxy(
          "Person", "person", "ObjectPerson", "personable", "object_people")
      }

    , documentable: {
        documents: Proxy(
          "Document", "document", "ObjectDocument", "documentable", "object_documents")
      }

    , related_object: {
        related_objects_as_source: Proxy(
          null, "destination", "Relationship", "source", "related_destinations")
      , related_objects_as_destination: Proxy(
          null, "source", "Relationship", "destination", "related_sources")
      , related_objects: Multi(["related_objects_as_source", "related_objects_as_destination"])
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      }

    // Program
    , Program: {
        _mixins: [
            "related_object", "personable", "documentable", "objectiveable"
          , extended_related("data_assets")
          , extended_related("facilities")
          , extended_related("markets")
          , extended_related("org_groups")
          , extended_related("processes")
          , extended_related("products")
          , extended_related("projects")
          , extended_related("systems")
          ]
      , controls: Proxy(
          "Control", "control", "ProgramControl", "program", "program_controls")
      /*, objectives: Proxy(
          "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")*/
      , directives: Proxy(
          null, "directive", "ProgramDirective", "program", "program_directives")
      , contracts: TypeFilter("directives", "Contract")
      , policies: TypeFilter("directives", "Policy")
      , regulations: TypeFilter("directives", "Regulation")
      , audits: Direct("Audit", "program")

      , sections_via_directives: Cross("directives", "sections")
      , sections_via_controls: Cross("controls", "sections")
      , sections: Multi(["sections_via_controls", "sections_via_directives"])

      , controls_via_directives: Cross("directives", "controls")
      , controls_via_sections: Cross("sections", "controls")
      , objectives_via_sections: Cross("sections", "objectives")
      , extended_related_objectives: Multi(["objectives_via_sections", "objectives"])
      , controls_via_extended_objectives: Cross("extended_related_objectives", "controls")
      , extended_related_controls: Multi([
            "controls_via_extended_objectives"
          , "controls_via_sections"
          , "controls_via_directives"
          , "controls"])

      , related_documents_via_sections: Cross("sections", "documents")
      , related_documents_via_extended_controls: Cross("extended_related_controls", "documents")
      , related_documents_via_extended_objectives: Cross("extended_related_objectives", "documents")
      , extended_related_documents:
          Multi([
              "documents"
            , "related_documents_via_extended_controls"
            , "related_documents_via_extended_objectives"
            , "related_documents_via_sections"
            ])

      , related_people_via_sections: Cross("sections", "people")
      , related_people_via_extended_controls: Cross("extended_related_controls", "people")
      , related_people_via_extended_objectives: Cross("extended_related_objectives", "people")
      , extended_related_people:
          Multi([
              "people"
            , "related_people_via_extended_controls"
            , "related_people_via_extended_objectives"
            , "related_people_via_sections"
            ])

      , related_objects_via_sections:
          Cross("sections", "related_objects")
      , related_objects_via_extended_controls:
          Cross("extended_related_controls", "related_objects")
      , related_objects_via_extended_objectives:
          Cross("extended_related_objectives", "related_objects")
      , extended_related_objects:
          Multi([
              "related_objects_via_extended_controls"
            , "related_objects_via_extended_objectives"
            , "related_objects_via_sections"
            , "related_objects"
            ])
      /*, extended_related_data_assets: TypeFilter("extended_related_objects", "DataAsset")
      , extended_related_facilities:  TypeFilter("extended_related_objects", "Facility")
      , extended_related_markets:     TypeFilter("extended_related_objects", "Market")
      , extended_related_org_groups:  TypeFilter("extended_related_objects", "OrgGroup")
      , extended_related_processes:   TypeFilter("extended_related_objects", "Process")
      , extended_related_products:    TypeFilter("extended_related_objects", "Product")
      , extended_related_projects:    TypeFilter("extended_related_objects", "Project")
      , extended_related_systems:     TypeFilter("extended_related_objects", "System")
      */
      }

    , directive_object: {
        _mixins: [
          "related_object", "personable", "documentable"//, "objectiveable"
          , extended_related("data_assets")
          , extended_related("facilities")
          , extended_related("markets")
          , extended_related("org_groups")
          , extended_related("processes")
          , extended_related("products")
          , extended_related("projects")
          , extended_related("systems")
          ]
      , sections: Direct("Section", "directive")
      , controls: Direct("Control", "directive")

      , controls_via_sections: Cross("sections", "controls")
      , objectives_via_sections: Cross("sections", "objectives")
      , extended_related_objectives: Multi(["objectives_via_sections"])//, "objectives"])
      , controls_via_extended_objectives: Cross("extended_related_objectives", "controls")
      , extended_related_controls: Multi([
            "controls_via_extended_objectives"
          , "controls_via_sections"
          , "controls"])

      , related_objects_via_sections: Cross("sections", "related_objects")

      , related_documents_via_sections: Cross("sections", "documents")
      , related_documents_via_extended_controls: Cross("extended_related_controls", "documents")
      , related_documents_via_extended_objectives: Cross("extended_related_objectives", "documents")
      , extended_related_documents:
          Multi([
              "documents"
            , "related_documents_via_extended_controls"
            , "related_documents_via_extended_objectives"
            , "related_documents_via_sections"
            ])

      , related_people_via_sections: Cross("sections", "people")
      , related_people_via_extended_controls: Cross("extended_related_controls", "people")
      , related_people_via_extended_objectives: Cross("extended_related_objectives", "people")
      , extended_related_people:
          Multi([
              "people"
            , "related_people_via_extended_controls"
            , "related_people_via_extended_objectives"
            , "related_people_via_sections"
            ])
      }

    // Directives
    , Regulation: {
        _mixins: ["directive_object"]
      }
    , Contract: {
        _mixins: ["directive_object"]
      }
    , Policy: {
        _mixins: ["directive_object"]
      }

    // Business objects
    , business_object: {
        _mixins: [
            "related_object", "personable", "documentable"
          , "controllable", "objectiveable", "sectionable"
          ]
      }

    , DataAsset: {
        _mixins: ["business_object"]
      }
    , Facility: {
        _mixins: ["business_object"]
      }
    , Market: {
        _mixins: ["business_object"]
      }
    , OrgGroup: {
        _mixins: ["business_object"]
      }
    , Product: {
        _mixins: ["business_object"]
      }
    , Project: {
        _mixins: ["business_object"]
      }
    , System: {
        _mixins: ["business_object"]
      }
    , Process: {
        _mixins: ["business_object"]
      }

    , Audit : {
      requests: Direct("Request", "audit")
    }
    , Request : {
      responses: Direct("Response", "request")
      , assignee : Direct("Person", null)
    }

  });
})(GGRC, can);
