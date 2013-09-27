..
  Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
  Created By: silas@reciprocitylabs.com
  Maintained By: silas@reciprocitylabs.com


How-To's
-------------------

To attach Controls to Systems:
- Declare Control and System objects
- Declare ObjectControl object with controllable=system object, control=control object
- Append ObjectControl object to ``object_controls`` attribute of Control object
- Add Control object to session and commit (``db.session.add()``, ``db.session.commit()``) 

To attach Controls to Categories:
- Declare Control and Category objects
- Append category object(s) to .categories attribute of Control object
- Add and commit control object if not already


Expected Behavior Clarification
-------------------

Exporting: “Map:” columns can have multiple \n-delimited entries per row, one for each thing that they map to.

Importing: With controls, the spreadsheet should indicate which policy it is associated with in the top two lines.  If a control code already exists, its updated withe the data from the new sheet.  If it does not exist, it is created.


Problems
-------------------

SqlAlchemy throws a warning when start/end dates are empty, even though this is expected behavior and should simply leave those values as null.

