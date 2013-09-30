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

Re-exporting: The re-export ("consistency") test, given that it imports, requires mapped objects to already exist, so if the imported csv has such items, they must already be declared to exist and given matching slug names.

Problems
-------------------

SqlAlchemy throws a warning when start/end dates are empty, even though this is expected behavior and should simply leave those values as null.

Testing re-exports: There is a small testability issue in the spreadsheets: the expected behavior is that, on import, it ignores the user's purpoted created/updated fields in favor of the actual date on which the file was imported.  Thus, there is no guarantee that (in this respect) the imported and re-exported files will match.  There are three possible ways around this for the purpose of unit testing:

A) Mock out the ``datetime.now()`` where it is invoked in export so that it will think that today is the same as the date in the same import sheet.

B) Have the test compare the imported and re-exported spreadsheets in a way that ignores the created/updated entries.

C) Dynamically generate the sample import sheet so that its date is the same as the current date.

Currently, method B is used, for which the ``helpers.py`` file is created.

Useful Mock/Patch Tricks
-------------------

To cut off and capture a call within a file being tested (so that it is not executed and you can examine what arguments were passed to it), use a patch decorator and represent the called object by an additional argument in the test function.  For example, if you want to "patch out" the call to ``foo.bar()`` which is invoked in the module ``baz1.baz2.quux`` when executing the test ``test_method``, it should begin as follows:

::

  from mock import patch
  @patch('baz1.baz2.quux.foo.bar')
  def test_method(self, mocked_object):

You can then test that it has received calls with particular arguments:

::

  mocked_object.assert_called_once_with(arg1, arg2, ...)

You may also find it useful, when debugging tests, to inspect the arguments that are passed.  The method ``.mock_calls`` returns a list of calls, from which a tuple of the function name, arg tuple, and keyword arg dict can be extracted.  If you want to extract out the values for the first call, you may find this idiom helpful:

::

  function_name, args, kwargs = mocked_object.mock_calls[0]

Then the arguments can be accessed by index in the variable ``args``, or by key in the dict ``kwargs``.

Read more about the mock library `here<http://www.voidspace.org.uk/python/mock/mock.html>`_.

The method .mock_calls on ``mocked_object`` will return a list of the calls made to it.
