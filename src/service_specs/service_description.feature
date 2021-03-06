Feature: Rather than have clients keep a list of the endpoint URLs for
  gGRC-Core services, a service description document will be provided that
  lists the endpoints by name.

  Scenario: GET the service description for gGRC-CORE
    Given nothing new
    When GET of "/api" as "service_description"
    Then all expected endpoints are listed and GETtable in "service_description"
      | endpoint           | max_query_count |
      | Categorization     | -1              |
      | Category           | -1              |
      | Control            | 12              |
      | ControlAssessment  | 10              |
      | ControlRisk        | 10              |
      | Cycle              | 10              |
      | DataAsset          | 10              |
      | Directive          | -1              |
      | DirectiveControl   | 10              |
      | Contract           | 10              |
      | Policy             | 10              |
      | Regulation         | 10              |
      | Document           | 10              |
      | Facility           | 10              |
      | Market             | 10              |
      | Meeting            | 10              |
      | Objective          | 10              |
      | ObjectiveControl   | 10              |
      | ObjectDocument     | 10              |
      | ObjectPerson       | 10              |
      | ObjectControl      | 10              |
      | ObjectSection      | 10              |
      | ObjectObjective    | 10              |
      | Option             | 10              |
      | OrgGroup           | 10              |
      | PbcList            | 10              |
      | Person             | 10              |
      | PopulationSample   | 10              |
      | Product            | 10              |
      | Project            | 10              |
      | Program            | 10              |
      | ProgramDirective   | 10              |
      | Relationship       | -1              |
      | Request            | 10              |
      | Response           | 10              |
      | Risk               | 10              |
      | RiskyAttribute     | 10              |
      | RiskRiskyAttribute | 10              |
      | Section            | 10              |
      | SectionObjective   | 10              |
      | SystemOrProcess    | -1              |
      | System             | 10              |
      | Process            | 10              |
