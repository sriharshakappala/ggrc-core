..
  Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
  Created By: david@reciprocitylabs.com
  Maintained By: vraj@reciprocitylabs.com


.. _EventLogResource:

*********************
Event Log Resource
*********************

An event log resource represents changes made to GGRC resources resulting
from an atomic HTTP POST, PUT, or DELETE request. The event log resource
is intended to provide a feed of events that occur in GGRC for display to
users.

An event log resource has a media type of ``application/json`` and is an
object containing a collection of :ref:`Event` objects.

.. rubric:: Example

.. sourcecode:: javascript

    {
        "events_collection": {
            "selfLink": "/api/events",
            "events": [
                {
                    "selfLink": "/api/events/6",
                    "action": "POST",
                    "modified_by": {
                        "href": "/api/people/79",
                        "type": "Person",
                        "id": 79
                    },
                    "resource_id": 1457,
                    "created_at": "2013-07-29T14:51:52",
                    "updated_at": "2013-07-29T14:51:52",
                    "resource_type": "Section",
                    "context": null,
                    "id": 6,
                    "revisions": [
                        {
                            "href": "/api/revisions/6",
                            "type": "Revision",
                            "id": 6
                        }
                    ]
                }
            ]
        }
    }


Event Log Content
====================

.. list-table::
   :widths: 20 10 70
   :header-rows: 1

   * - Property
     - Type
     - Description
   * - ``selfLink``
     - string
     - The url of this resource.
   * - ``events``
     - array
     - A collection of :ref:`Event` objects.

.. _Event:

Event 
=====

.. list-table::
   :widths: 20 10 70
   :header-rows: 1

   * - Property
     - Type
     - Description
   * - ``selfLink``
     - string
     - The url of the event resource.
   * - ``modified_by``
     - resource
     - The resource link to the person who initiated the request.
   * - ``resource_type``
     - string
     - The type of the root object modified by the request.
   * - ``resource_id``
     - integer
     - The id of the root object modified by the request.
   * - ``created_at``
     - timestamp
     - ISO 8601 formatted UTC timestamp indicating the time at which this event happened.
   * - ``updated_at``
     - timestamp
     - ISO 8601 formatted UTC timestamp indicating the time at which this event happened.
   * - ``action``
     - string
     - HTTP verb indicating type of the request, or IMPORT, indicating that an import was performed.
   * - ``context``
     - int
     - The RBAC context of the event.
   * - ``revisions``
     - array
     - A collection of :ref:`Revision` objects.

.. _Revision:

Revision
========

.. rubric:: Example

.. sourcecode:: javascript

  {
      "revision": {
          "modified_by": {
              "href": "/api/people/1",
              "type": "Person",
              "id": 1
          },
          "description": "My Program created",
          "resource_id": 1,
          "created_at": "2013-09-18T12:15:04",
          "updated_at": "2013-09-18T12:15:04",
          "content": {
              "kind": "Directive",
              "display_name": "My Program",
              "description": "",
              "end_date": null,
              "title": "My Program",
              "url": "",
              "context_id": null,
              "created_at": "2013-09-18T12:15:04",
              "updated_at": "2013-09-18T12:15:04",
              "start_date": null,
              "scope": "",
              "modified_by_id": 1,
              "id": 1,
              "organization": "",
              "slug": "PROGRAM-1",
              "owner_id": null
          },
          "resource_type": "Program",
          "context": null,
          "action": "created",
          "id": 1,
          "selfLink": "/api/revisions/1"
      }
  }


.. list-table::
   :widths: 20 10 70
   :header-rows: 1

   * - Property
     - Type
     - Description
   * - ``selfLink``
     - string
     - The url of the revision resource.
   * - ``modified_by``
     - resource
     - The resource link to the person who initiated the request.
   * - ``resource_type``
     - string
     - The type of the root object modified by the request.
   * - ``resource_id``
     - integer
     - The id of the root object modified by the request.
   * - ``created_at``
     - timestamp
     - ISO 8601 formatted UTC timestamp indicating the time at which this event happened.
   * - ``updated_at``
     - timestamp
     - ISO 8601 formatted UTC timestamp indicating the time at which this event happened.
   * - ``action``
     - string
     - The nature of the change made - 'created', 'modified', or 'deleted'.
   * - ``context``
     - int
     - The RBAC context of the event.
   * - ``description``
     - string
     - A textual description of the change that was made.
   * - ``content``
     - string
     - A JSON representation of the current state of the database row enumerating all the columns and their values. In the case of a DELETE, this is the
       last state of the database row before the DELETE.

