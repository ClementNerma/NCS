
# NCS Changelog

v1.0 (final)
- Variables support
- Modules support
- Packages importation support (from current directory of from global packages directory)
- Namespaces support
- Basic conditions support
- Display and choices JS functions
- Fatal errors support

v1.0-a (bug fixed)
- [Bug fixed] The `ncs shell` command didn't work

v1.1
- Added arrays support
- Added objects support
- Added arguments type arrays and objects
- Added functions to check if a variable is a string, a number, an array, an object, etc.
- Added `for` loop
- Added `while` loop
- Added labels support
- Mathematical expressions can be used in variables' assignement
- Variables are supported in mathematical expressions
- Can access to object's and array's properties. The property's name can be a variable (example : `write {strings[{index}]}`)
- [Bug fixed] Colors and variables were ignored in a string when placed at the beginning or at the end of the string
- [Bug fixed] `if` conditions didn't works property, and this also cause problems in `while` loops
- [Bug fixed] Variables didn't works fine when used in strings (example : `write "{string}"`);
- [Bug fixed] `prompt` native command didn't work
- [Optimization] Optimized `if` conditions (including `else`)
- [Script] Added a test script to test the most part of NCS features.
